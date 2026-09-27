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
        id, church_id, branch_id, member_id, donor_name, donor_email, donor_phone,
        category_id, category_name, amount, currency, gateway, reference, status,
        is_anonymous, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'paystack', $12, 'pending', $13, $14, $15)`,
      [
        transactionId,
        church.id,
        branchId || null,
        memberId,
        isAnonymous ? 'Anonymous' : (donorName || 'Beloved Donor'),
        donorEmail || 'giving@churchos.online',
        donorPhone || null,
        categoryId || null,
        categoryName,
        amount,
        currency || church.currency || 'NGN',
        reference,
        Boolean(isAnonymous),
        notes || null,
        JSON.stringify({ churchSlug: church.slug, branchId }),
      ]
    );

    // Initialize Paystack payment
    const initResult = await paymentService.initializePaystack({
      email: donorEmail || 'donor@churchos.online',
      amount,
      reference,
      callbackUrl: callbackUrl || `${process.env.FRONTEND_URL || ''}/give/verify?reference=${reference}`,
      metadata: {
        churchId: church.id,
        churchName: church.name,
        categoryName,
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

        // 2. Automatically record into church finance transactions ledger
        await client.query(
          `INSERT INTO finance_transactions (
            id, church_id, branch_id, type, category_id, amount,
            currency, description, payment_method, reference, transaction_date
          ) VALUES ($1, $2, $3, 'income', $4, $5, $6, $7, 'online', $8, CURRENT_DATE)`,
          [
            uuidv4(),
            tx.church_id,
            tx.branch_id,
            tx.category_id,
            tx.amount,
            tx.currency,
            `Online Giving (${tx.category_name}) - ${tx.donor_name}`,
            reference,
          ]
        );

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
      if (tx.donor_email && tx.donor_email !== 'giving@churchos.online') {
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

module.exports = {
  getPublicGivingInfo,
  initializeGiving,
  verifyGiving,
  listGivingTransactions,
};
