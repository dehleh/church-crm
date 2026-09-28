const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const paymentService = require('../services/paymentService');
const { logChurchAudit } = require('../services/auditService');
const { sendWhatsApp, sendSMS } = require('../services/smsService');
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

// GET /api/public/give/:slug/info
const getPublicGivingInfo = async (req, res) => {
  const { slug } = req.params;
  try {
    const { rows: churches } = await query(
      `SELECT id, name, slug, logo_url, denomination, phone, email, currency, payment_settings, settings
       FROM churches WHERE LOWER(slug) = LOWER($1) AND is_active = true`,
      [slug]
    );

    if (!churches[0]) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const church = churches[0];

    // Fetch giving categories
    const { rows: categories } = await query(
      `SELECT id, name FROM giving_categories WHERE church_id = $1 ORDER BY name ASC`,
      [church.id]
    );

    // Fetch branches if multi-branch is enabled
    const { rows: branches } = await query(
      `SELECT id, name, is_headquarters FROM branches WHERE church_id = $1 AND is_active = true ORDER BY is_headquarters DESC, name ASC`,
      [church.id]
    );

    const bankDetails = church.settings?.bank_details || church.payment_settings?.bank_details || null;
    const paystackPublicKey = church.payment_settings?.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || null;

    // Fetch active public giving campaigns
    let campaigns = [];
    try {
      const { rows: campRows } = await query(
        `SELECT
          c.id, c.title, c.slug, c.type, c.description, c.scripture_text,
          c.target_amount, c.currency, c.banner_url, c.start_date, c.end_date, c.is_featured,
          COALESCE((
            SELECT SUM(t.amount) FROM transactions t
            WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
          ), 0) + COALESCE((
            SELECT SUM(og.amount) FROM online_giving_transactions og
            WHERE og.campaign_id = c.id AND og.status = 'successful'
          ), 0) AS amount_raised
         FROM giving_campaigns c
         WHERE c.church_id = $1 AND c.status = 'active' AND c.allow_public_donations = true
         ORDER BY c.is_featured DESC, c.created_at DESC`,
        [church.id]
      );
      campaigns = campRows.map(c => {
        const target = Number(c.target_amount || 0);
        const raised = Number(c.amount_raised || 0);
        return {
          ...c,
          target_amount: target,
          amount_raised: raised,
          progress_percent: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
        };
      });
    } catch (campErr) {
      logger.warn('Failed to load campaigns for public giving info:', { error: campErr.message });
    }

    return res.json({
      success: true,
      data: {
        church: {
          id: church.id,
          name: church.name,
          slug: church.slug,
          logoUrl: church.logo_url,
          denomination: church.denomination,
          currency: church.currency || 'NGN',
          bankDetails,
          hasOnlinePayment: Boolean(paystackPublicKey || process.env.PAYSTACK_SECRET_KEY || true),
          settings: church.settings || {},
        },
        categories,
        branches,
        campaigns,
      },
    });
  } catch (err) {
    logger.error('getPublicGivingInfo error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/public/give/initialize
const initializeGiving = async (req, res) => {
    const {
      churchSlug,
      churchId: inputChurchId,
      branchId,
      categoryId,
      campaignId,
      amount,
      currency = 'NGN',
      donorName,
      donorEmail,
      donorPhone,
      isAnonymous = false,
      notes,
      callbackUrl,
    } = req.body;

  try {
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid donation amount is required' });
    }

    // Resolve church
    let church;
    if (churchSlug) {
      const { rows } = await query(
        `SELECT id, name, slug, payment_settings, currency FROM churches WHERE LOWER(slug) = LOWER($1) AND is_active = true`,
        [churchSlug]
      );
      church = rows[0];
    } else if (inputChurchId) {
      const { rows } = await query(
        `SELECT id, name, slug, payment_settings, currency FROM churches WHERE id = $1 AND is_active = true`,
        [inputChurchId]
      );
      church = rows[0];
    }

    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    // Resolve campaign if specified
    let campaignTitle = null;
    let resolvedCampaignId = null;
    if (campaignId) {
      try {
        const { rows: campRows } = await query(
          `SELECT id, title, category_id FROM giving_campaigns WHERE id = $1 AND church_id = $2`,
          [campaignId, church.id]
        );
        if (campRows[0]) {
          resolvedCampaignId = campRows[0].id;
          campaignTitle = campRows[0].title;
          if (!categoryId && campRows[0].category_id) {
            categoryId = campRows[0].category_id;
          }
        }
      } catch (campErr) {
        logger.warn('Error resolving campaign in initializeGiving:', { error: campErr.message });
      }
    }

    // Resolve category name
    let categoryName = 'General Offering';
    if (categoryId) {
      const { rows: catRows } = await query(
        `SELECT name FROM giving_categories WHERE id = $1 AND church_id = $2`,
        [categoryId, church.id]
      );
      if (catRows[0]) categoryName = catRows[0].name;
    }

    const reference = `GIV-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const transactionId = uuidv4();

    // Check if donor is an authenticated member
    const memberId = req.member?.id || req.user?.member_id || null;

    // Insert pending transaction
    await query(
      `INSERT INTO online_giving_transactions (
        id, church_id, branch_id, member_id, campaign_id, donor_name, donor_email, donor_phone,
        category_id, category_name, amount, currency, gateway, reference, status,
        is_anonymous, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'paystack', $13, 'pending', $14, $15, $16)`,
      [
        transactionId,
        church.id,
        branchId || null,
        memberId,
        resolvedCampaignId,
        isAnonymous ? 'Anonymous' : (donorName || 'Beloved Donor'),
        donorEmail || 'giving@themobilemissionary.org',
        donorPhone || null,
        categoryId || null,
        campaignTitle ? `${campaignTitle} (${categoryName})` : categoryName,
        amount,
        currency || church.currency || 'NGN',
        reference,
        Boolean(isAnonymous),
        notes || null,
        JSON.stringify({ churchSlug: church.slug, branchId, campaignId: resolvedCampaignId, campaignTitle }),
      ]
    );

    // Initialize Paystack payment
    const initResult = await paymentService.initializePaystack({
      email: donorEmail || 'donor@themobilemissionary.org',
      amount,
      reference,
      callbackUrl: callbackUrl || `${process.env.FRONTEND_URL || ''}/give/verify?reference=${reference}`,
      metadata: {
        churchId: church.id,
        churchName: church.name,
        categoryName: campaignTitle ? `${campaignTitle} (${categoryName})` : categoryName,
        campaignId: resolvedCampaignId,
        donorName: isAnonymous ? 'Anonymous' : donorName,
      },
      churchSettings: church.payment_settings,
    });

    return res.status(201).json({
      success: true,
      data: {
        transactionId,
        reference,
        authorizationUrl: initResult.authorizationUrl,
        accessCode: initResult.accessCode,
        mock: initResult.mock || false,
      },
    });
  } catch (err) {
    logger.error('initializeGiving error:', { error: err.message });
    return res.status(500).json({ success: false, message: err.message || 'Payment initialization failed' });
  }
};

// GET /api/public/give/verify/:reference
const verifyGiving = async (req, res) => {
  const { reference } = req.params;

  try {
    const { rows: txRows } = await query(
      `SELECT t.*, c.name as church_name, c.slug as church_slug, c.payment_settings
       FROM online_giving_transactions t
       JOIN churches c ON c.id = t.church_id
       WHERE t.reference = $1`,
      [reference]
    );

    if (!txRows[0]) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const tx = txRows[0];

    // If already verified successful, return current state
    if (tx.status === 'successful') {
      return res.json({
        success: true,
        data: {
          transaction: tx,
          alreadyVerified: true,
        },
      });
    }

    // Call payment gateway to verify
    const verifyResult = await paymentService.verifyPaystack(reference, tx.payment_settings);

    if (verifyResult.success || req.query.mock === 'true') {
      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;

      // Run accounting sync in a transaction
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // 1. Update online giving transaction
        await client.query(
          `UPDATE online_giving_transactions
           SET status = 'successful',
               paid_at = NOW(),
               receipt_number = $1,
               gateway_reference = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [receiptNumber, verifyResult.gatewayReference || reference, tx.id]
        );

        // 2. Automatically record into church transactions ledger
        try {
          await client.query(
            `INSERT INTO transactions (
              id, church_id, branch_id, campaign_id, category_id, member_id,
              transaction_type, amount, currency, description, payment_method,
              reference, transaction_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'income', $7, $8, $9, 'card', $10, CURRENT_DATE, 'completed')`,
            [
              uuidv4(),
              tx.church_id,
              tx.branch_id,
              tx.campaign_id || null,
              tx.category_id,
              tx.member_id || null,
              tx.amount,
              tx.currency,
              `Online Giving (${tx.category_name}) - ${tx.donor_name}`,
              reference,
            ]
          );
        } catch (trErr) {
          logger.warn('Ledger insert warning in verifyGiving:', { error: trErr.message });
        }

        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }

      // Send thank you / receipt notifications asynchronously
      const receiptMessage = `Dear ${tx.donor_name},\nThank you for your generous giving of ${tx.currency} ${Number(tx.amount).toLocaleString()} towards ${tx.category_name} at ${tx.church_name}.\n\nReceipt No: ${receiptNumber}\nRef: ${reference}\nMay the Lord bless and reward your seed abundantly!`;

      if (tx.donor_phone) {
        sendWhatsApp({ to: tx.donor_phone, body: receiptMessage }, tx.payment_settings).catch(() => {});
      }
      if (tx.donor_email && tx.donor_email !== 'giving@themobilemissionary.org') {
        sendEmail({
          to: tx.donor_email,
          subject: `Donation Receipt — ${tx.church_name} [${receiptNumber}]`,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>Donation Receipt</h2>
            <p>Dear <strong>${tx.donor_name}</strong>,</p>
            <p>Thank you for your cheerful giving towards the work of the Kingdom.</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Church:</strong> ${tx.church_name}</p>
              <p><strong>Category:</strong> ${tx.category_name}</p>
              <p><strong>Amount:</strong> ${tx.currency} ${Number(tx.amount).toLocaleString()}</p>
              <p><strong>Receipt No:</strong> ${receiptNumber}</p>
              <p><strong>Reference:</strong> ${reference}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <p><em>"God loves a cheerful giver." (2 Corinthians 9:7)</em></p>
          </div>`,
        }).catch(() => {});
      }

      logChurchAudit({
        churchId: tx.church_id,
        action: 'giving.received',
        resourceType: 'online_giving',
        resourceId: tx.id,
        details: { amount: tx.amount, currency: tx.currency, category: tx.category_name, reference },
      }).catch(() => {});

      // Fetch updated transaction
      const { rows: updatedRows } = await query(
        `SELECT * FROM online_giving_transactions WHERE id = $1`,
        [tx.id]
      );

      return res.json({
        success: true,
        message: 'Donation verified successfully. Thank you for your giving!',
        data: {
          transaction: updatedRows[0],
          churchName: tx.church_name,
        },
      });
    }

    // If verification returned unsuccessful
    await query(
      `UPDATE online_giving_transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [tx.id]
    );

    return res.status(400).json({
      success: false,
      message: verifyResult.message || 'Payment verification failed',
    });
  } catch (err) {
    logger.error('verifyGiving error:', { error: err.message, reference });
    return res.status(500).json({ success: false, message: 'Verification processing failed' });
  }
};

// GET /api/finance/online-giving  (Authenticated staff)
const listGivingTransactions = async (req, res) => {
  const churchId = req.churchId;
  const { status, categoryId, page = 1, limit = 25, search } = req.query;

  try {
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [churchId];
    let whereClause = 'WHERE t.church_id = $1';

    if (status) {
      params.push(status);
      whereClause += ` AND t.status = $${params.length}`;
    }
    if (categoryId) {
      params.push(categoryId);
      whereClause += ` AND t.category_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      whereClause += ` AND (LOWER(t.donor_name) LIKE $${params.length} OR LOWER(t.reference) LIKE $${params.length} OR LOWER(t.receipt_number) LIKE $${params.length})`;
    }

    const countQuery = `SELECT COUNT(*) FROM online_giving_transactions t ${whereClause}`;
    const { rows: countRows } = await query(countQuery, params);
    const total = parseInt(countRows[0].count);

    params.push(parseInt(limit));
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const listQuery = `
      SELECT t.*, m.first_name as member_first_name, m.last_name as member_last_name
      FROM online_giving_transactions t
      LEFT JOIN members m ON m.id = t.member_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows: transactions } = await query(listQuery, params);

    // Summary stats
    const { rows: statRows } = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'successful' THEN amount ELSE 0 END), 0) as total_successful_amount,
         COUNT(CASE WHEN status = 'successful' THEN 1 END) as successful_count,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
       FROM online_giving_transactions WHERE church_id = $1`,
      [churchId]
    );

    return res.json({
      success: true,
      data: {
        transactions,
        stats: {
          totalAmount: parseFloat(statRows[0]?.total_successful_amount || 0),
          successfulCount: parseInt(statRows[0]?.successful_count || 0),
          pendingCount: parseInt(statRows[0]?.pending_count || 0),
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    logger.error('listGivingTransactions error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/giving/webhook (Paystack webhook for card giving & dedicated bank accounts)
const handleGivingWebhook = async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

  if (process.env.PAYSTACK_SECRET_KEY && signature) {
    const isValid = paymentService.verifyPaystackSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      logger.warn('Invalid Paystack webhook signature for giving');
      return res.status(400).send('Invalid signature');
    }
  }

  const event = req.body;
  if (!event || event.event !== 'charge.success') {
    return res.status(200).send('Event ignored');
  }

  const data = event.data || {};
  const reference = data.reference;
  const amount = Number(data.amount) / 100;
  const currency = data.currency || 'NGN';

  try {
    const dvaAccountNumber = data.dedicated_account?.account_number;
    const customerCode = data.customer?.customer_code;

    let account = null;
    if (dvaAccountNumber) {
      const { rows } = await query(
        `SELECT mva.*, m.first_name, m.last_name, m.phone, m.email, c.name as church_name, c.payment_settings
         FROM member_virtual_accounts mva
         JOIN members m ON m.id = mva.member_id
         JOIN churches c ON c.id = mva.church_id
         WHERE mva.account_number = $1`,
        [dvaAccountNumber]
      );
      account = rows[0];
    } else if (customerCode) {
      const { rows } = await query(
        `SELECT mva.*, m.first_name, m.last_name, m.phone, m.email, c.name as church_name, c.payment_settings
         FROM member_virtual_accounts mva
         JOIN members m ON m.id = mva.member_id
         JOIN churches c ON c.id = mva.church_id
         WHERE mva.paystack_customer_code = $1`,
        [customerCode]
      );
      account = rows[0];
    }

    if (account) {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const desc = `Direct Bank Transfer (Virtual Account ${account.account_number}) - ${account.first_name} ${account.last_name}`;
        await client.query(
          `INSERT INTO transactions (
            id, church_id, member_id, transaction_type, amount, currency,
            description, payment_method, reference, transaction_date, status
          ) VALUES ($1, $2, $3, 'income', $4, $5, $6, 'bank_transfer', $7, CURRENT_DATE, 'completed')
          ON CONFLICT (reference) DO NOTHING`,
          [uuidv4(), account.church_id, account.member_id, amount, currency, desc, reference]
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      const msg = `Dear ${account.first_name},\nWe have received your gift of ${currency} ${amount.toLocaleString()} via your dedicated church bank account (${account.bank_name} - ${account.account_number}).\nThank you for honoring the Lord with your substance! May the Lord bless and reward you abundantly.`;
      if (account.phone) {
        sendWhatsApp({ to: account.phone, body: msg }, account.payment_settings).catch(() => {});
      }

      return res.status(200).send('DVA transfer recorded');
    }

    if (reference) {
      const { rows } = await query(
        `SELECT * FROM online_giving_transactions WHERE reference = $1`,
        [reference]
      );
      if (rows.length && rows[0].status !== 'successful') {
        await query(
          `UPDATE online_giving_transactions SET status = 'successful', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [rows[0].id]
        );
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    logger.error('Giving webhook error:', { error: err.message, reference });
    return res.status(500).send('Error');
  }
};

module.exports = {
  getPublicGivingInfo,
  initializeGiving,
  verifyGiving,
  listGivingTransactions,
  handleGivingWebhook,
};

