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
}

const paymentService = new PaymentService();
module.exports = paymentService;
