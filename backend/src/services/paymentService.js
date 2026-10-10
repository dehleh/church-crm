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
   * Initialize a Flutterwave transaction (Multi-Currency Standard Hosted Checkout)
   */
  async initializeFlutterwave({ email, amount, currency = 'NGN', reference, callbackUrl, customerName, customerPhone, metadata = {}, churchSettings = {} }) {
    const secretKey =
      churchSettings?.flutterwaveSecretKey ||
      process.env.FLUTTERWAVE_SECRET_KEY ||
      '';

    if (!secretKey) {
      logger.warn('Flutterwave secret key not configured, returning mock authorization URL');
      return {
        success: true,
        mock: true,
        authorizationUrl: `${callbackUrl || '/give/verify'}?reference=${reference}&status=successful&mock=true&gateway=flutterwave`,
        reference,
      };
    }

    const payload = {
      tx_ref: reference,
      amount: Number(amount),
      currency: (currency || 'NGN').toUpperCase(),
      redirect_url: callbackUrl,
      customer: {
        email: email || 'donor@themobilemissionary.org',
        name: customerName || 'Kingdom Giver',
        phonenumber: customerPhone || undefined,
      },
      customizations: {
        title: metadata?.churchName ? `${metadata.churchName} Giving` : 'Church Giving',
        description: metadata?.categoryName || 'Kingdom Seed & Offering',
        logo: metadata?.logoUrl || undefined,
      },
      meta: metadata,
    };

    const options = {
      hostname: 'api.flutterwave.com',
      port: 443,
      path: '/v3/payments',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    try {
      const res = await this.request(options, payload);
      if (res.data?.status === 'success' && res.data?.data?.link) {
        return {
          success: true,
          authorizationUrl: res.data.data.link,
          reference,
        };
      }
      throw new Error(res.data?.message || 'Failed to initialize Flutterwave transaction');
    } catch (err) {
      logger.error('Flutterwave initialization error:', { error: err.message, reference });
      throw err;
    }
  }

  /**
   * Verify a Flutterwave transaction by reference or transaction ID
   */
  async verifyFlutterwave(reference, churchSettings = {}, transactionId = null) {
    const secretKey =
      churchSettings?.flutterwaveSecretKey ||
      process.env.FLUTTERWAVE_SECRET_KEY ||
      '';

    if (!secretKey) {
      // Mock verification mode
      return {
        success: true,
        mock: true,
        status: 'successful',
        amount: 1000,
        currency: 'NGN',
        reference,
        gatewayReference: `FLW-MOCK-${Date.now()}`,
        paidAt: new Date().toISOString(),
      };
    }

    const verifyPath = transactionId
      ? `/v3/transactions/${encodeURIComponent(transactionId)}/verify`
      : `/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;

    const options = {
      hostname: 'api.flutterwave.com',
      port: 443,
      path: verifyPath,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    };

    try {
      const res = await this.request(options);
      const d = res.data?.data;
      if (res.data?.status === 'success' && d) {
        const isSuccessful = d.status === 'successful';
        return {
          success: isSuccessful,
          status: d.status,
          amount: Number(d.amount),
          currency: d.currency,
          reference: d.tx_ref || reference,
          gatewayReference: String(d.id || d.flw_ref || ''),
          customer: d.customer,
          paidAt: d.created_at || new Date().toISOString(),
          metadata: d.meta,
        };
      }
      return { success: false, status: 'failed', message: res.data?.message || 'Flutterwave verification failed' };
    } catch (err) {
      logger.error('Flutterwave verification error:', { error: err.message, reference });
      throw err;
    }
  }

  /**
   * Verify Flutterwave Webhook Signature (verif-hash header)
   */
  verifyFlutterwaveSignature(reqSecretHash, churchSettings = {}) {
    const secretHash =
      churchSettings?.flutterwaveSecretHash ||
      process.env.FLUTTERWAVE_SECRET_HASH ||
      churchSettings?.flutterwaveSecretKey ||
      process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretHash || !reqSecretHash) return false;
    return reqSecretHash === secretHash;
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

  /**
   * List available banks for disbursement / transfer
   */
  async listBanks(churchSettings = {}) {
    const secretKey =
      churchSettings?.paystackSecretKey ||
      process.env.PAYSTACK_SECRET_KEY ||
      '';

    if (secretKey) {
      try {
        const res = await this.request({
          hostname: 'api.paystack.co',
          port: 443,
          path: '/bank?country=nigeria&perPage=100',
          method: 'GET',
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          return res.data.data.map(b => ({
            name: b.name,
            code: b.code,
            slug: b.slug,
            active: b.active,
          }));
        }
      } catch (err) {
        logger.warn('Failed to fetch banks from Paystack API, falling back to built-in list:', { error: err.message });
      }
    }
    return DEFAULT_BANKS;
  }

  /**
   * Resolve Nigerian bank account name
   */
  async resolveAccount({ accountNumber, bankCode, churchSettings = {} }) {
    const secretKey =
      churchSettings?.paystackSecretKey ||
      process.env.PAYSTACK_SECRET_KEY ||
      '';

    if (secretKey) {
      try {
        const res = await this.request({
          hostname: 'api.paystack.co',
          port: 443,
          path: `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
          method: 'GET',
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (res.data?.status && res.data?.data) {
          return {
            success: true,
            accountNumber: res.data.data.account_number,
            accountName: res.data.data.account_name,
            bankId: res.data.data.bank_id,
          };
        }
      } catch (err) {
        logger.warn('Failed to resolve account via Paystack:', { error: err.message });
      }
    }
    return {
      success: false,
      message: 'Could not automatically verify account name. You can enter it manually.',
    };
  }

  /**
   * Initiate a Paystack Transfer / Disbursement
   */
  async initiateDisbursement({ amount, accountNumber, bankCode, accountName, narration, reference, churchSettings = {} }) {
    const secretKey =
      churchSettings?.paystackSecretKey ||
      process.env.PAYSTACK_SECRET_KEY ||
      '';

    const safeRef = reference || `PSTK-TRF-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    if (!secretKey) {
      return {
        success: true,
        mock: true,
        status: 'success',
        reference: safeRef,
        transferCode: `TRF_MOCK_${Date.now()}`,
        amount,
        accountName,
        accountNumber,
        message: 'Disbursement recorded and simulated successfully (No Paystack secret key configured)',
      };
    }

    try {
      // Step 1: Create Transfer Recipient
      const recipientPayload = {
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
        description: narration || 'Church Requisition Disbursement',
      };

      const recipientRes = await this.request({
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transferrecipient',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }, recipientPayload);

      if (!recipientRes.data?.status || !recipientRes.data?.data?.recipient_code) {
        throw new Error(recipientRes.data?.message || 'Failed to create transfer recipient on Paystack');
      }

      const recipientCode = recipientRes.data.data.recipient_code;

      // Step 2: Initiate Transfer
      const transferPayload = {
        source: 'balance',
        amount: Math.round(Number(amount) * 100), // kobo
        recipient: recipientCode,
        reason: narration || 'Church Requisition Disbursement',
        reference: safeRef,
      };

      const transferRes = await this.request({
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transfer',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }, transferPayload);

      if (transferRes.data?.status && transferRes.data?.data) {
        const d = transferRes.data.data;
        return {
          success: true,
          status: d.status || 'success',
          reference: d.reference || safeRef,
          transferCode: d.transfer_code,
          recipientCode,
          amount: Number(amount),
          accountName,
          accountNumber,
          message: transferRes.data.message || 'Transfer queued successfully',
        };
      }

      throw new Error(transferRes.data?.message || 'Paystack transfer initiation failed');
    } catch (err) {
      logger.error('Disbursement transfer failed:', { error: err.message, reference: safeRef });
      throw err;
    }
  }
}

const DEFAULT_BANKS = [
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'gtbank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'United Bank for Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
  { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
  { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
  { name: 'OPay Digital Services', code: '999992', slug: 'opay' },
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'Moniepoint Microfinance Bank', code: '50515', slug: 'moniepoint-mfb' },
  { name: 'VFD Microfinance Bank', code: '566', slug: 'vfd' },
  { name: 'Rubies MFB', code: '125', slug: 'rubies-mfb' },
  { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
  { name: 'Taj Bank', code: '302', slug: 'taj-bank' },
  { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
];

const paymentService = new PaymentService();
module.exports = paymentService;
