const crypto = require('crypto');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { on: jest.fn() },
}));

jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/smsService', () => ({
  sendWhatsApp: jest.fn().mockResolvedValue(true),
  sendSMS: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/auditService', () => ({
  logChurchAudit: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/twoFactorService', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../src/queue', () => ({
  getJob: jest.fn(),
}));

const db = require('../../src/config/database');
const paymentService = require('../../src/services/paymentService');
const twoFactorService = require('../../src/services/twoFactorService');
const { getJob } = require('../../src/queue');
const givingController = require('../../src/controllers/givingController');
const jobsController = require('../../src/controllers/jobsController');
const procurementController = require('../../src/controllers/procurementController');
const memberAuthController = require('../../src/controllers/memberAuthController');
const twoFactorController = require('../../src/controllers/twoFactorController');
const { resolveWriteBranchId, applyBranchFilter } = require('../../src/utils/branchScope');
const { syncBudgetSpend } = require('../../src/utils/budgetSync');

const makeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.send = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

describe('P0/P1/P2 Security & Architecture Fixes', () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origAllowMock = process.env.ALLOW_MOCK_PAYMENTS;
  const origPaystack = process.env.PAYSTACK_SECRET_KEY;
  const origFlwHash = process.env.FLUTTERWAVE_SECRET_HASH;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.ALLOW_MOCK_PAYMENTS;
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.FLUTTERWAVE_SECRET_HASH;
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
  });

  afterAll(() => {
    process.env.NODE_ENV = origNodeEnv;
    if (origAllowMock !== undefined) process.env.ALLOW_MOCK_PAYMENTS = origAllowMock;
    if (origPaystack !== undefined) process.env.PAYSTACK_SECRET_KEY = origPaystack;
    if (origFlwHash !== undefined) process.env.FLUTTERWAVE_SECRET_HASH = origFlwHash;
  });

  describe('P0: Payment Gateway Fail-Closed & Timing-Safe Signatures', () => {
    it('fails closed in production when Paystack key is absent', async () => {
      process.env.NODE_ENV = 'production';
      expect(paymentService.isMockAllowed()).toBe(false);
      await expect(
        paymentService.initializePaystack({ email: 'a@b.com', amount: 5000, reference: 'REF-1' })
      ).rejects.toThrow('Paystack payment gateway is not configured');

      const verifyRes = await paymentService.verifyPaystack('REF-1');
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.status).toBe('failed');
    });

    it('verifies Paystack HMAC-SHA512 signature strictly', () => {
      const secret = 'sk_test_12345';
      const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'GIV-1' } });
      const validSig = crypto.createHmac('sha512', secret).update(raw).digest('hex');

      expect(paymentService.verifyPaystackSignature(raw, validSig, secret)).toBe(true);
      expect(paymentService.verifyPaystackSignature(raw, '0'.repeat(validSig.length), secret)).toBe(false);
      expect(paymentService.verifyPaystackSignature(raw, 'short', secret)).toBe(false);
    });

    it('rejects verifyGiving ?mock=true bypass when paid amount mismatches expected amount', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'tx-1',
          church_id: 'ch-1',
          church_name: 'Grace Church',
          amount: 50000,
          currency: 'NGN',
          gateway: 'paystack',
          status: 'pending',
          payment_settings: {},
        }],
      });
      // verifyGiving marks transaction failed when amountVerified fails
      db.query.mockResolvedValueOnce({ rows: [] });

      const req = {
        params: { reference: 'GIV-AMOUNT-TEST' },
        query: { mock: 'true' },
      };
      const res = makeRes();

      // In test mode with no key, verifyPaystack returns mock amount=1000 which is < 50000
      // and even with ?mock=true, givingController verifies verifyResult.amount / status;
      // Wait: check if mock:true sets verifyResult.mock in test mode -> verifyPaystack returning status!='success' fails.
      jest.spyOn(paymentService, 'verifyPaystack').mockResolvedValueOnce({
        success: true,
        mock: false,
        status: 'success',
        amount: 100,
        currency: 'NGN',
      });

      await givingController.verifyGiving(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects Flutterwave giving webhook with missing or invalid verif-hash', async () => {
      process.env.FLUTTERWAVE_SECRET_HASH = 'expected-hash';
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'tx-1', amount: 1000, currency: 'NGN', payment_settings: {} }],
      });

      const req = {
        headers: { 'verif-hash': 'wrong-hash' },
        body: { event: 'charge.completed', data: { tx_ref: 'GIV-123', status: 'successful', amount: 1000 } },
      };
      const res = makeRes();

      await givingController.handleGivingWebhook(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toBe('Invalid signature');
    });

    it('rejects Paystack giving webhook when x-paystack-signature is missing', async () => {
      const req = { headers: {}, body: { event: 'charge.success', data: { reference: 'GIV-1' } } };
      const res = makeRes();
      await givingController.handleGivingWebhook(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toBe('No signature');
    });
  });

  describe('P1: Tenant Isolation, Workflow Security & Auth Hardening', () => {
    it('blocks cross-tenant background job polling and strips internal churchId', async () => {
      getJob.mockResolvedValueOnce({ id: 'job-1', status: 'completed', churchId: 'other-church', result: { imported: 5 } });
      const crossReq = { params: { id: 'job-1' }, churchId: 'my-church', user: { is_super_admin: false } };
      const crossRes = makeRes();
      await jobsController.getJobStatus(crossReq, crossRes);
      expect(crossRes.statusCode).toBe(404);

      getJob.mockResolvedValueOnce({ id: 'job-1', status: 'completed', churchId: 'my-church', result: { imported: 5 } });
      const sameReq = { params: { id: 'job-1' }, churchId: 'my-church', user: { is_super_admin: false } };
      const sameRes = makeRes();
      await jobsController.getJobStatus(sameReq, sameRes);
      expect(sameRes.statusCode).toBe(200);
      expect(sameRes.body.data.churchId).toBeUndefined();
      expect(sameRes.body.data.status).toBe('completed');
    });

    it('blocks HOD from approving requisitions and blocks status="disbursed" via PATCH', async () => {
      db.query.mockResolvedValue({
        rows: [{ id: 'req-1', church_id: 'ch-1', status: 'submitted', raised_by: 'u-other' }],
      });

      const hodReq = {
        params: { id: 'req-1' },
        churchId: 'ch-1',
        user: { id: 'u-hod', role: 'hod', is_super_admin: false },
        body: { status: 'approved' },
      };
      const hodRes = makeRes();
      await procurementController.updateRequisition(hodReq, hodRes);
      expect(hodRes.statusCode).toBe(403);

      const disbReq = {
        params: { id: 'req-1' },
        churchId: 'ch-1',
        user: { id: 'u-admin', role: 'head_pastor', is_super_admin: false },
        body: { status: 'disbursed' },
      };
      const disbRes = makeRes();
      await procurementController.updateRequisition(disbReq, disbRes);
      expect(disbRes.statusCode).toBe(400);
    });

    it('blocks member account takeover via memberNumber when password_hash already exists', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 'ch-1', slug: 'grace', name: 'Grace', settings: { member_portal_enabled: true } }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'm-1', email: 'm@example.com', member_number: 'MBR-00001', password_hash: '$2a$12$existing' }],
        });

      const req = {
        body: {
          churchSlug: 'grace',
          email: 'm@example.com',
          memberNumber: 'MBR-00001',
          password: 'AttackerPassword123!',
        },
      };
      const res = makeRes();
      await memberAuthController.setPassword(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('locks out verify2FALogin after repeated failed verification attempts', async () => {
      const pendingToken = jwt.sign({ userId: 'u-1', is2FAPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'u-1',
            email: 'admin@church.org',
            church_id: 'ch-1',
            church_active: true,
            is_super_admin: false,
            two_factor_enabled: true,
            two_factor_secret: 'SECRET',
            two_factor_backup_codes: [],
            failed_login_attempts: 4,
            locked_until: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });
      twoFactorService.verifyToken.mockReturnValue(false);

      const req = { body: { twoFactorToken: pendingToken, code: '000000' } };
      const res = makeRes();
      await twoFactorController.verify2FALogin(req, res);
      expect(res.statusCode).toBe(401);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET failed_login_attempts = $1, locked_until = $2'),
        [5, expect.any(String), 'u-1']
      );

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'u-1',
          email: 'admin@church.org',
          church_id: 'ch-1',
          church_active: true,
          is_super_admin: false,
          two_factor_enabled: true,
          failed_login_attempts: 5,
          locked_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }],
      });
      const lockedRes = makeRes();
      await twoFactorController.verify2FALogin(req, lockedRes);
      expect(lockedRes.statusCode).toBe(423);
    });
  });

  describe('P2: Branch Scoping & Budget Synchronization Helpers', () => {
    it('pins write branch_id for branch_admin and branch_pastor', () => {
      const branchReq = { branchId: 'br-assigned', user: { role: 'branch_pastor' } };
      expect(resolveWriteBranchId(branchReq, 'br-tampered')).toBe('br-assigned');

      const hqReq = { branchId: null, user: { role: 'head_pastor' } };
      expect(resolveWriteBranchId(hqReq, 'br-target')).toBe('br-target');
    });

    it('appends parameterized branch filters cleanly', () => {
      const conditions = ['m.church_id = $1'];
      const params = ['ch-1'];
      const nextIdx = applyBranchFilter({ branchId: 'br-1' }, 'm.branch_id', conditions, params, 2);
      expect(conditions).toEqual(['m.church_id = $1', 'm.branch_id = $2']);
      expect(params).toEqual(['ch-1', 'br-1']);
      expect(nextIdx).toBe(3);
    });

    it('synchronizes matching active budgets on expense creation', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
      await syncBudgetSpend(client, {
        churchId: 'ch-1',
        branchId: 'br-1',
        amount: 25000,
        transactionDate: '2026-11-12',
      });
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE budgets'),
        [25000, 'ch-1', '2026-11-12', 'br-1']
      );
    });
  });
});
