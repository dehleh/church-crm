require('../setup');

jest.mock('../../src/config/database', () => {
  const mockQuery = jest.fn();
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    query: mockQuery,
    getClient: jest.fn().mockResolvedValue(mockClient),
    pool: { on: jest.fn() },
    __mockQuery: mockQuery,
    __mockClient: mockClient,
  };
});

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(),
  stream: { write: jest.fn() },
}));

const db = require('../../src/config/database');
const { PLANS, getPlan } = require('../../src/services/plans');
const {
  getCurrentSubscription,
  initializeSubscription,
  verifySubscription,
} = require('../../src/controllers/subscriptionController');
const paymentService = require('../../src/services/paymentService');

function mockReqRes(body = {}, params = {}, queryParams = {}) {
  const req = {
    body,
    params,
    query: queryParams,
    headers: { origin: 'http://localhost:5173' },
    churchId: 'church-123',
    user: { id: 'user-123', email: 'pastor@tbc.ng', church_name: 'The Baptizing Church' },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('Subscription & Plan Management Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Plans Catalogue', () => {
    it('should have valid starter, growth, and enterprise plan definitions', () => {
      expect(PLANS.starter).toBeDefined();
      expect(PLANS.starter.priceNgn).toBe(250000);
      expect(PLANS.starter.billingInterval).toBe('annual');
      expect(PLANS.starter.branchLimit).toBe(1);
      expect(PLANS.starter.multiBranch).toBe(false);

      expect(PLANS.growth).toBeDefined();
      expect(PLANS.growth.priceNgn).toBe(600000);
      expect(PLANS.growth.billingInterval).toBe('annual');
      expect(PLANS.growth.branchLimit).toBe(3);
      expect(PLANS.growth.multiBranch).toBe(true);

      expect(PLANS.enterprise).toBeDefined();
      expect(getPlan('starter').name).toBe('Starter');
      expect(getPlan('growth').name).toBe('Growth');
      expect(getPlan('nonexistent')).toBeNull();
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return subscription details, trial status, and days remaining', async () => {
      const expDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'church-123',
          name: 'The Baptizing Church',
          slug: 'tbc',
          subscription_plan: 'trial',
          subscription_status: 'active',
          subscription_expires_at: expDate,
          multi_branch_enabled: true,
          branch_limit: 3,
          member_limit: 500,
          is_whitelisted: false,
        }],
      });

      const { req, res } = mockReqRes();
      await getCurrentSubscription(req, res);

      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.subscriptionPlan).toBe('trial');
      expect(payload.data.isTrial).toBe(true);
      expect(payload.data.isExpired).toBe(false);
      expect(payload.data.daysRemaining).toBeGreaterThanOrEqual(9);
      expect(payload.data.multiBranchEnabled).toBe(true);
      expect(payload.data.branchLimit).toBe(3);
    });

    it('should flag expired subscription if past expiration date and not whitelisted', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'church-123',
          name: 'Expired Church',
          slug: 'expired',
          subscription_plan: 'starter',
          subscription_status: 'active',
          subscription_expires_at: pastDate,
          multi_branch_enabled: false,
          branch_limit: 1,
          is_whitelisted: false,
        }],
      });

      const { req, res } = mockReqRes();
      await getCurrentSubscription(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.isExpired).toBe(true);
      expect(payload.data.daysRemaining).toBe(0);
    });
  });

  describe('initializeSubscription', () => {
    it('should reject invalid or missing plan', async () => {
      const { req, res } = mockReqRes({ plan: 'super_diamond' });
      await initializeSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should initialize Paystack transaction for starter plan with annual billing', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const { req, res } = mockReqRes({ plan: 'starter' });
      await initializeSubscription(req, res);

      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.plan).toBe('starter');
      expect(payload.data.amountNgn).toBe(250000);
      expect(payload.data.billingCycle).toBe('annual');
      expect(payload.data.reference).toMatch(/^sub_/);
      expect(payload.data.authorizationUrl).toBeDefined();
    });

    it('should initialize Paystack transaction for growth plan with annual billing', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const { req, res } = mockReqRes({ plan: 'growth' });
      await initializeSubscription(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.plan).toBe('growth');
      expect(payload.data.amountNgn).toBe(600000);
      expect(payload.data.billingCycle).toBe('annual');
    });
  });

  describe('verifySubscription', () => {
    it('should verify payment, activate plan, and extend expiration date', async () => {
      const client = await db.getClient();
      client.query
        // 1. SELECT from subscription_transactions
        .mockResolvedValueOnce({
          rows: [{
            id: 'tx-1',
            reference: 'sub_test_123',
            church_id: 'church-123',
            plan: 'growth',
            amount_kobo: 60000000,
            status: 'pending',
            raw_payload: JSON.stringify({ billingCycle: 'annual' }),
          }],
        })
        // 2. BEGIN
        .mockResolvedValueOnce({})
        // 3. UPDATE subscription_transactions
        .mockResolvedValueOnce({})
        // 4. SELECT subscription_expires_at FROM churches
        .mockResolvedValueOnce({
          rows: [{
            subscription_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            subscription_plan: 'trial',
          }],
        })
        // 5. UPDATE churches
        .mockResolvedValueOnce({
          rows: [{
            id: 'church-123',
            subscription_plan: 'growth',
            subscription_status: 'active',
            multi_branch_enabled: true,
            branch_limit: 3,
            subscription_expires_at: new Date(Date.now() + 370 * 24 * 60 * 60 * 1000).toISOString(),
          }],
        })
        // 6. INSERT audit_logs
        .mockResolvedValueOnce({})
        // 7. COMMIT
        .mockResolvedValueOnce({});

      const { req, res } = mockReqRes({ reference: 'sub_test_123' });
      await verifySubscription(req, res);

      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.subscription_plan).toBe('growth');
      expect(payload.data.multi_branch_enabled).toBe(true);
      expect(payload.data.branch_limit).toBe(3);
    });
  });
});
