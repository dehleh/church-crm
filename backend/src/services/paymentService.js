const https = require('https');
const crypto = require('crypto');
const logger = require('../config/logger');

class PaymentService {
  /**
   * Helper for HTTP JSON requests
   */
  request(options, postData) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: body });
          }
        });
      });
      req.on('error', reject);
      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    });
  }

  /**
   * Initialize a Paystack transaction
   */
  async initializePaystack({ email, amount, reference, callbackUrl, metadata = {}, churchSettings = {} }) {
    const secretKey =
      churchSettings?.paystackSecretKey ||
      process.env.PAYSTACK_SECRET_KEY ||
      '';

    if (!secretKey) {
      logger.warn('Paystack secret key not configured, returning mock authorization URL');
      return {
        success: true,
        mock: true,
        authorizationUrl: `${callbackUrl || '/give/verify'}?reference=${reference}&status=success&mock=true`,
        reference,
      };
    }

    const payload = {
      email,
      amount: Math.round(Number(amount) * 100), // convert to kobo / cents
      reference,
      callback_url: callbackUrl,
      metadata,
    };

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    try {
      const res = await this.request(options, payload);
      if (res.data?.status && res.data?.data?.authorization_url) {
        return {
          success: true,
          authorizationUrl: res.data.data.authorization_url,
          accessCode: res.data.data.access_code,
          reference: res.data.data.reference,
        };
      }
      throw new Error(res.data?.message || 'Failed to initialize Paystack transaction');
    } catch (err) {
      logger.error('Paystack initialization error:', { error: err.message, reference });
      throw err;
    }
  }

  /**
   * Verify a Paystack transaction
   */
  async verifyPaystack(reference, churchSettings = {}) {
    const secretKey =
      churchSettings?.paystackSecretKey ||
      process.env.PAYSTACK_SECRET_KEY ||
      '';

    if (!secretKey) {
      // Mock mode
      return {
        success: true,
        mock: true,
        status: 'success',
        amount: 1000,
        currency: 'NGN',
        reference,
        paidAt: new Date().toISOString(),
      };
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    };

    try {
      const res = await this.request(options);
      const d = res.data?.data;
      if (res.data?.status && d) {
        return {
          success: d.status === 'success',
          status: d.status,
          amount: d.amount / 100,
          currency: d.currency,
          reference: d.reference,
          gatewayReference: String(d.id),
          customer: d.customer,
          paidAt: d.paid_at,
          metadata: d.metadata,
        };
      }
      return { success: false, status: 'failed', message: res.data?.message || 'Verification failed' };
    } catch (err) {
      logger.error('Paystack verification error:', { error: err.message, reference });
      throw err;
    }
  }

  /**
   * Verify Paystack Webhook Signature
   */
  verifyPaystackSignature(rawBody, signature, secretKey) {
    const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
    if (!key || !signature) return false;
    const hash = crypto.createHmac('sha512', key).update(rawBody).digest('hex');
    return hash === signature;
  }

  /**
   * Assign or generate a Dedicated Virtual Account (DVA) for a member
   */
  async assignDedicatedVirtualAccount({ churchId, member, churchName, churchSettings = {} }) {
    const { query } = require('../config/database');

    // Check if account already exists
    const existing = await query(
      `SELECT * FROM member_virtual_accounts WHERE church_id = $1 AND member_id = $2`,
      [churchId, member.id]
    );
    if (existing.rows.length && existing.rows[0].is_active) {
      return existing.rows[0];
    }

    const secretKey =
      churchSettings?.paystackSecretKey ||
      process.env.PAYSTACK_SECRET_KEY ||
      '';

    let bankName = 'Wema Bank';
    let accountNumber = '';
    let accountName = `${churchName || 'Church'} - ${member.first_name || ''} ${member.last_name || ''}`.trim();
    let customerCode = null;
    let dedicatedAccountId = null;

    if (secretKey) {
      try {
        // 1. Create or fetch Paystack customer
        const custPayload = {
          email: member.email || `giving.${member.id.replace(/-/g, '').substring(0, 10)}@themobilemissionary.org`,
          first_name: member.first_name || 'Member',
          last_name: member.last_name || 'Church',
          phone: member.phone || undefined,
        };
        const custRes = await this.request({
          hostname: 'api.paystack.co',
          port: 443,
          path: '/customer',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }, custPayload);

        customerCode = custRes.data?.data?.customer_code;

        // 2. Assign dedicated virtual account
        if (customerCode) {
          const dvaRes = await this.request({
            hostname: 'api.paystack.co',
            port: 443,
            path: '/dedicated_account',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
          }, {
            customer: customerCode,
            preferred_bank: 'wema-bank',
          });

          if (dvaRes.data?.status && dvaRes.data?.data) {
            const d = dvaRes.data.data;
            bankName = d.bank?.name || 'Wema Bank';
            accountNumber = d.account_number;
            accountName = d.account_name || accountName;
            dedicatedAccountId = String(d.id || '');
          }
        }
      } catch (err) {
        logger.warn('Paystack live DVA assignment fell back to internal generator:', { error: err.message });
      }
    }

    // If live Paystack did not return an account number (mock mode, test sandbox, or offline fallback)
    if (!accountNumber) {
      let attempts = 0;
      while (!accountNumber && attempts < 10) {
        attempts++;
        const rand8 = Math.floor(10000000 + Math.random() * 90000000).toString();
        const candidate = `01${rand8}`;
        const check = await query('SELECT 1 FROM member_virtual_accounts WHERE account_number = $1', [candidate]);
        if (check.rows.length === 0) {
          accountNumber = candidate;
        }
      }
      if (!customerCode) customerCode = `CUS_MOCK_${member.id ? member.id.substring(0, 8) : '00000000'}`;
      if (!dedicatedAccountId) dedicatedAccountId = `DVA_MOCK_${member.id ? member.id.substring(0, 8) : '00000000'}`;
    }

    const { rows } = await query(
      `INSERT INTO member_virtual_accounts (
        church_id, member_id, bank_name, account_number, account_name,
        paystack_customer_code, paystack_dedicated_account_id, currency, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'NGN', true)
      ON CONFLICT (church_id, member_id)
      DO UPDATE SET
        bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        account_name = EXCLUDED.account_name,
        paystack_customer_code = EXCLUDED.paystack_customer_code,
        paystack_dedicated_account_id = EXCLUDED.paystack_dedicated_account_id,
        is_active = true,
        updated_at = NOW()
      RETURNING *`,
      [churchId, member.id, bankName, accountNumber, accountName, customerCode, dedicatedAccountId]
    );

    return rows[0];
  }
}

const paymentService = new PaymentService();
module.exports = paymentService;
