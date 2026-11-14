require('../setup');

jest.mock('../../src/config/database', () => {
  const mockQuery = jest.fn();
  const mockClient = { query: jest.fn(), release: jest.fn() };
  return {
    query: mockQuery,
    getClient: jest.fn().mockResolvedValue(mockClient),
    healthCheck: jest.fn().mockResolvedValue(true),
    pool: { on: jest.fn(), end: jest.fn().mockResolvedValue() },
    __mockQuery: mockQuery,
    __mockClient: mockClient,
  };
});

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  stream: { write: jest.fn() },
}));

jest.mock('../../src/services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
  sendWhatsApp: jest.fn().mockResolvedValue({ success: true }),
}));

const db = require('../../src/config/database');
const childCtrl = require('../../src/controllers/childCheckInController');
const givingCtrl = require('../../src/controllers/givingController');
const pledgeCtrl = require('../../src/controllers/pledgeController');
const servicePlansCtrl = require('../../src/controllers/servicePlansController');

function mockReqRes(reqData = {}) {
  const req = {
    churchId: 'church-uuid-1',
    user: { id: 'user-uuid-1' },
    params: {},
    query: {},
    body: {},
    ...reqData,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('Core Feature Suites & Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Child Safety Check-In & Security Claim Tags
  describe('Child Safety Check-In & Security Claim Tags', () => {
    it('checks in child and generates randomized security claim code', async () => {
      const { req, res } = mockReqRes({
        body: {
          eventId: 'evt-1',
          childName: 'Samuel Mensah',
          classroom: 'Toddlers',
          parentName: 'David Mensah',
          parentPhone: '+2348011112222',
        },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'child-checkin-1',
          child_name: 'Samuel Mensah',
          security_code: 'A123',
          status: 'checked_in',
        }],
      });

      await childCtrl.checkInChild(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          securityCode: expect.any(String),
          data: expect.objectContaining({ child_name: 'Samuel Mensah' }),
        })
      );
    });

    it('rejects checkout with 403 when security claim code does not match', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'child-checkin-1' },
        body: { securityCode: 'WRONG' },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'child-checkin-1',
          security_code: 'K724',
          status: 'checked_in',
          child_name: 'Samuel Mensah',
        }],
      });

      await childCtrl.checkOutChild(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Security claim code does not match'),
        })
      );
    });

    it('successfully checks out child when security code matches identically', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'child-checkin-1' },
        body: { securityCode: 'K724', pickupPersonName: 'David Mensah' },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'child-checkin-1',
          security_code: 'K724',
          status: 'checked_in',
          child_name: 'Samuel Mensah',
        }],
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'child-checkin-1',
          status: 'checked_out',
          pickup_person_name: 'David Mensah',
        }],
      });

      await childCtrl.checkOutChild(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'checked_out' }),
        })
      );
    });
  });

  // 2. Annual Giving & Tax Contribution Statements
  describe('Annual Giving & Tax Contribution Statements', () => {
    it('generates itemized tax statement with category summary and tax exempt disclaimer', async () => {
      const { req, res } = mockReqRes({
        params: { memberId: 'mem-1' },
        query: { year: '2026' },
      });

      // Church query
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'church-uuid-1',
          name: 'Grace Cathedral',
          settings: { financial: { tax_id: 'TAX-998877', signatory_name: 'Pastor Paul' } },
        }],
      });
      // Member query
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'mem-1',
          first_name: 'Grace',
          last_name: 'Okafor',
          member_number: 'MBR-00100',
        }],
      });
      // Category summary query
      db.query.mockResolvedValueOnce({
        rows: [
          { category_name: 'Tithe', count: 12, total_amount: 120000 },
          { category_name: 'Building Fund', count: 2, total_amount: 50000 },
        ],
      });
      // Items query
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'tx-1', transaction_date: '2026-01-10', amount: 10000, category_name: 'Tithe' },
          { id: 'tx-2', transaction_date: '2026-02-15', amount: 50000, category_name: 'Building Fund' },
        ],
      });

      await givingCtrl.getAnnualGivingStatement(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            statementNumber: 'STMT-2026-MBR-00100',
            totalAmount: 60000,
            disclaimer: expect.stringContaining('intangible religious benefits'),
            signatory: expect.objectContaining({ name: 'Pastor Paul' }),
          }),
        })
      );
    });
  });

  // 3. Capital Campaign Pledges ("Pledged vs. Redeemed")
  describe('Capital Campaign Pledges', () => {
    it('registers a new faith pledge for a capital campaign', async () => {
      const { req, res } = mockReqRes({
        body: {
          campaignId: 'camp-1',
          donorName: 'Enoch Ade',
          pledgeAmount: 250000,
          frequency: 'monthly',
        },
      });

      // Campaign existence check
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'camp-1', title: 'Cathedral Expansion', currency: 'NGN' }],
      });
      // Insert pledge
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'pledge-1',
          campaign_id: 'camp-1',
          donor_name: 'Enoch Ade',
          pledge_amount: 250000,
          amount_fulfilled: 0,
          status: 'active',
        }],
      });

      await pledgeCtrl.createPledge(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ pledge_amount: 250000, status: 'active' }),
        })
      );
    });

    it('records pledge fulfillment and automatically updates status to fulfilled when redeemed in full', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'pledge-1' },
        body: { amount: 150000, notes: 'Final installment' },
      });

      // Select pledge
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'pledge-1',
          pledge_amount: 200000,
          amount_fulfilled: 50000,
          currency: 'NGN',
          status: 'active',
        }],
      });
      // Update pledge
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'pledge-1',
          pledge_amount: 200000,
          amount_fulfilled: 200000,
          status: 'fulfilled',
        }],
      });

      await pledgeCtrl.fulfillPledge(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'fulfilled', amount_fulfilled: 200000 }),
        })
      );
    });
  });

  // 4. Volunteer Blockout Dates & Swap Requests
  describe('Volunteer Blockout Dates & Conflict Prevention', () => {
    it('prevents scheduling volunteer with 409 Conflict when member has an active blockout date', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'plan-1' },
        body: {
          roleTitle: 'Lead Sound Engineer',
          memberId: 'mem-10',
        },
      });

      // Service plan check
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'plan-1', service_date: '2026-12-25' }],
      });
      // Blockout date check (found active blockout covering service_date)
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'blockout-1',
          member_id: 'mem-10',
          start_date: '2026-12-20',
          end_date: '2026-12-28',
          reason: 'Family Holiday',
        }],
      });

      await servicePlansCtrl.addVolunteer(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Family Holiday'),
        })
      );
    });
  });

  // 5. Live Service Mode & Live Cueing
  describe('Live Service Mode & Live Cueing', () => {
    it('updates live cue state with active item index and status', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'plan-1' },
        body: {
          liveState: {
            activeItemIndex: 2,
            status: 'live',
            startedAt: '2026-11-14T10:00:00Z',
          },
        },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'plan-1',
          live_state: { activeItemIndex: 2, status: 'live', startedAt: '2026-11-14T10:00:00Z' },
        }],
      });

      await servicePlansCtrl.updateLiveCueState(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ activeItemIndex: 2, status: 'live' }),
        })
      );
    });
  });
});
