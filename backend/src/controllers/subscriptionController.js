const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { PLANS, PLAN_CODES, getPlan } = require('../services/plans');
const paymentService = require('../services/paymentService');
const { sendEmail } = require('../services/emailService');

/**
 * Sends a branded tax receipt email to church administrators upon plan activation.
 */
async function sendSubscriptionReceiptEmail({ churchId, plan, reference, amountNgn, expiresAt }) {
  try {
    const { rows } = await query(
      `SELECT c.name as church_name, c.settings, u.email, u.first_name
       FROM churches c
       LEFT JOIN users u ON u.church_id = c.id AND u.role = 'admin' AND u.is_active = true
       WHERE c.id = $1
       ORDER BY u.created_at ASC
       LIMIT 1`,
      [churchId]
    );

    const info = rows[0];
    if (!info || !info.email) return;

    const churchSettings = info.settings?.messaging || {};
    const formattedAmount = Number(amountNgn || 0).toLocaleString();
    const formattedExp = new Date(expiresAt).toLocaleDateString('en-NG', { dateStyle: 'long' });

    await sendEmail({
      to: info.email,
      subject: `Payment Confirmed: ${plan.toUpperCase()} Plan Activated — ChurchOS`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 22px; font-weight: bold; color: #4338ca;">⛪ ChurchOS</span>
            <span style="float: right; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 99px; border: 1px solid #a7f3d0;">
              ✓ PAID & VERIFIED
            </span>
          </div>
          <h2 style="color: #111827; margin-top: 0;">Subscription Activated</h2>
          <p>Dear ${info.first_name || 'Pastor / Administrator'},</p>
          <p>Your subscription payment for <strong>${info.church_name}</strong> was successful and processed securely via Paystack.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 6px 0;"><strong>Church:</strong> ${info.church_name}</p>
            <p style="margin: 0 0 6px 0;"><strong>Selected Plan:</strong> ${plan.toUpperCase()} (Annual)</p>
            <p style="margin: 0 0 6px 0;"><strong>Billing Period:</strong> 1 Year (Annual)</p>
            <p style="margin: 0 0 6px 0;"><strong>Paystack Reference:</strong> ${reference}</p>
            <p style="margin: 0 0 6px 0;"><strong>Amount Paid:</strong> ₦${formattedAmount} NGN</p>
            <p style="margin: 0;"><strong>Active Until:</strong> ${formattedExp}</p>
          </div>

          <p style="font-size: 13px; color: #374151;">
            Your church management system, branches, attendance registers, and ministerial features are completely active with uninterrupted service.
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
            You can view or print your official accounting tax invoice at any time in ChurchOS under <strong>Settings → Billing & Plans</strong>.
          </p>
        </div>
      `,
    }, churchSettings);

    logger.info('Dispatched subscription receipt email', { churchId, email: info.email, reference });
  } catch (err) {
    logger.warn('Failed to send subscription receipt email', { error: err.message, churchId });
  }
}

/**
 * GET /api/subscription/current
 * Returns current tenant's subscription status, days left, plan, and available upgrade plans.
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, slug, subscription_plan, subscription_status,
              subscription_expires_at, multi_branch_enabled, branch_limit,
              member_limit, is_whitelisted
       FROM churches WHERE id = $1`,
      [req.churchId]
    );

    const church = rows[0];
    if (!church) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const exp = church.subscription_expires_at ? new Date(church.subscription_expires_at) : null;
    const now = new Date();
    const daysRemaining = exp ? Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
    const isTrial = church.subscription_plan === 'trial' || (church.subscription_plan && church.subscription_plan.startsWith('trial_'));
    const isExpired = Boolean(exp && exp < now && !church.is_whitelisted);

    return res.json({
      success: true,
      data: {
        churchId: church.id,
        churchName: church.name,
        churchSlug: church.slug,
        subscriptionPlan: church.subscription_plan || 'trial',
        subscriptionStatus: church.subscription_status || 'active',
        subscriptionExpiresAt: church.subscription_expires_at,
        multiBranchEnabled: church.multi_branch_enabled || false,
        branchLimit: church.branch_limit || (church.multi_branch_enabled ? 3 : 1),
        memberLimit: church.member_limit || null,
        isWhitelisted: Boolean(church.is_whitelisted),
        daysRemaining,
        isTrial,
        isExpired,
        availablePlans: PLANS,
      },
    });
  } catch (err) {
    logger.error('Failed to get current subscription', { error: err.message, churchId: req.churchId });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/subscription/initialize
 * Starts Paystack transaction for church subscription renewal/upgrade.
 */
const initializeSubscription = async (req, res) => {
  const { plan } = req.body;
  const billingCycle = 'annual'; // Exclusively annual billing

  try {
    if (!plan || !PLAN_CODES.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Please choose one of: ${PLAN_CODES.filter(p => p !== 'enterprise').join(', ')}`,
      });
    }

    const planConfig = getPlan(plan);
    if (!planConfig || !planConfig.priceNgn) {
      return res.status(400).json({
        success: false,
        message: 'This plan requires custom quotation. Please contact sales/admin.',
      });
    }

    // Purely annual billing
    const amountNgn = planConfig.priceNgn;
    const amountKobo = Math.round(amountNgn * 100);

    const reference = `sub_${Date.now()}_${uuidv4().replace(/-/g, '').slice(0, 10)}`;

    // Ensure subscription_transactions table exists
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        provider VARCHAR(30) NOT NULL DEFAULT 'paystack',
        reference VARCHAR(255) UNIQUE,
        plan VARCHAR(30),
        amount_kobo BIGINT,
        currency VARCHAR(10) DEFAULT 'NGN',
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Record pending transaction
    await query(
      `INSERT INTO subscription_transactions
        (id, church_id, provider, reference, plan, amount_kobo, currency, status, raw_payload)
       VALUES ($1, $2, 'paystack', $3, $4, $5, 'NGN', 'pending', $6)`,
      [
        uuidv4(),
        req.churchId,
        reference,
        plan,
        amountKobo,
        JSON.stringify({ billingCycle, plan, amountNgn, initializedBy: req.user?.id }),
      ]
    );

    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:5173';
    const callbackUrl = `${origin}/settings?tab=subscription&reference=${reference}`;

    const initResult = await paymentService.initializePaystack({
      email: req.user.email,
      amount: amountNgn,
      reference,
      callbackUrl,
      metadata: {
        churchId: req.churchId,
        churchName: req.user.church_name,
        plan,
        billingCycle,
        type: 'church_subscription',
      },
    });

    return res.json({
      success: true,
      message: 'Subscription payment initialized',
      data: {
        reference,
        authorizationUrl: initResult.authorizationUrl,
        accessCode: initResult.accessCode || null,
        mock: Boolean(initResult.mock),
        amountNgn,
        plan,
        billingCycle,
      },
    });
  } catch (err) {
    logger.error('Initialize subscription payment failed', { error: err.message, churchId: req.churchId });
    return res.status(500).json({ success: false, message: err.message || 'Payment initialization failed' });
  }
};

/**
 * POST /api/subscription/verify
 * Verifies Paystack transaction, activates plan, sets expiration date, and updates multi-branch access.
 */
const verifySubscription = async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Transaction reference is required' });
  }

  const client = await getClient();
  try {
    const txRes = await client.query(
      `SELECT * FROM subscription_transactions WHERE reference = $1 AND church_id = $2`,
      [reference, req.churchId]
    );

    const tx = txRes.rows[0];
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Subscription transaction not found' });
    }

    if (tx.status === 'success') {
      return res.json({
        success: true,
        message: 'Subscription has already been activated.',
        data: { reference, status: 'success' },
      });
    }

    // Verify with Paystack (mock mode supported for local testing)
    const verifyResult = await paymentService.verifyPaystack(reference);

    if (verifyResult.status !== 'success') {
      await client.query(
        `UPDATE subscription_transactions SET status = 'failed', raw_payload = $1 WHERE id = $2`,
        [JSON.stringify(verifyResult), tx.id]
      );
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Payment verification failed',
      });
    }

    // Payment verified — update church subscription inside a transaction
    await client.query('BEGIN');

    // Update transaction
    await client.query(
      `UPDATE subscription_transactions SET status = 'success', raw_payload = $1 WHERE id = $2`,
      [JSON.stringify(verifyResult), tx.id]
    );

    // Fetch current church details
    const churchRes = await client.query(
      `SELECT subscription_expires_at, subscription_plan FROM churches WHERE id = $1 FOR UPDATE`,
      [req.churchId]
    );
    const church = churchRes.rows[0];

    const currentExp = church?.subscription_expires_at ? new Date(church.subscription_expires_at) : null;
    const now = new Date();
    const baseDate = currentExp && currentExp > now ? currentExp : now;

    const daysToAdd = 365; // Exclusively annual subscription (+1 year)
    const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const plan = tx.plan;
    const multiBranch = plan === 'growth' || plan === 'enterprise';
    const branchLimit = plan === 'growth' ? 3 : (plan === 'starter' ? 1 : null);

    const updateRes = await client.query(
      `UPDATE churches SET
         subscription_plan = $1,
         subscription_status = 'active',
         subscription_expires_at = $2,
         multi_branch_enabled = $3,
         branch_limit = $4,
         updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, slug, subscription_plan, subscription_status, subscription_expires_at, multi_branch_enabled, branch_limit`,
      [plan, newExpiresAt, multiBranch, branchLimit, req.churchId]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (id, church_id, user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, $3, 'subscription_activated', 'subscription', $4, $5)`,
      [
        uuidv4(),
        req.churchId,
        req.user.id,
        tx.id,
        JSON.stringify({ plan, newExpiresAt, reference, amount: tx.amount_kobo / 100 }),
      ]
    );

    await client.query('COMMIT');

    logger.info('Subscription successfully activated', {
      churchId: req.churchId,
      plan,
      reference,
      expiresAt: newExpiresAt,
    });

    // Send confirmation receipt email asynchronously
    sendSubscriptionReceiptEmail({
      churchId: req.churchId,
      plan,
      reference,
      amountNgn: tx.amount_kobo / 100,
      expiresAt: newExpiresAt,
    });

    return res.json({
      success: true,
      message: `🎉 Success! Your church is now on the ${plan.toUpperCase()} plan until ${newExpiresAt.toLocaleDateString()}.`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Subscription verification error', { error: err.message, churchId: req.churchId });
    return res.status(500).json({ success: false, message: 'Server error verifying subscription' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/subscription/history
 * Returns list of past subscription transactions for this church.
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, reference, plan, amount_kobo, currency, status, created_at
       FROM subscription_transactions
       WHERE church_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.churchId]
    );

    return res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        amountNgn: r.amount_kobo ? r.amount_kobo / 100 : 0,
      })),
    });
  } catch (err) {
    logger.error('Failed to get subscription history', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/subscription/webhook (Public Paystack Webhook)
 */
const handlePaystackWebhook = async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    return res.status(400).send('No signature');
  }

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const isValid = paymentService.verifyPaystackSignature(rawBody, signature);

  if (!isValid && process.env.NODE_ENV === 'production') {
    logger.warn('Invalid Paystack webhook signature for subscription');
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event && event.event === 'charge.success') {
    const reference = event.data?.reference;
    if (reference && reference.startsWith('sub_')) {
      try {
        const txRes = await query(
          `SELECT * FROM subscription_transactions WHERE reference = $1`,
          [reference]
        );
        const tx = txRes.rows[0];
        if (tx && tx.status !== 'success') {
          const client = await getClient();
          try {
            await client.query('BEGIN');
            await client.query(
              `UPDATE subscription_transactions SET status = 'success', raw_payload = $1 WHERE id = $2`,
              [JSON.stringify(event.data), tx.id]
            );
            const churchRes = await client.query(
              `SELECT subscription_expires_at, subscription_plan FROM churches WHERE id = $1 FOR UPDATE`,
              [tx.church_id]
            );
            const church = churchRes.rows[0];
            const currentExp = church?.subscription_expires_at ? new Date(church.subscription_expires_at) : null;
            const now = new Date();
            const baseDate = currentExp && currentExp > now ? currentExp : now;
            const daysToAdd = 365; // Exclusively annual subscription (+1 year)
            const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
            const plan = tx.plan;
            const multiBranch = plan === 'growth' || plan === 'enterprise';
            const branchLimit = plan === 'growth' ? 3 : (plan === 'starter' ? 1 : null);

            await client.query(
              `UPDATE churches SET
                 subscription_plan = $1,
                 subscription_status = 'active',
                 subscription_expires_at = $2,
                 multi_branch_enabled = $3,
                 branch_limit = $4,
                 updated_at = NOW()
               WHERE id = $5`,
              [plan, newExpiresAt, multiBranch, branchLimit, tx.church_id]
            );
            await client.query('COMMIT');
            logger.info('Subscription activated via Paystack webhook', { reference, churchId: tx.church_id });

            // Send confirmation receipt email asynchronously
            sendSubscriptionReceiptEmail({
              churchId: tx.church_id,
              plan,
              reference,
              amountNgn: tx.amount_kobo / 100,
              expiresAt: newExpiresAt,
            });
          } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
          } finally {
            client.release();
          }
        }
      } catch (err) {
        logger.error('Error processing subscription webhook', { error: err.message, reference });
      }
    }
  }

  return res.sendStatus(200);
};

module.exports = {
  getCurrentSubscription,
  initializeSubscription,
  verifySubscription,
  getSubscriptionHistory,
  handlePaystackWebhook,
};
