/**
 * Fellowship and Cell System unit tests.
 */
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
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(),
  stream: { write: jest.fn() },
}));

const db = require('../../src/config/database');
const ctrl = require('../../src/controllers/fellowshipController');

function mockReqRes(reqData = {}) {
  const req = {
    churchId: 'church-1',
    user: { id: 'user-1' },
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

describe('Fellowship & Cell Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFellowshipSettings', () => {
    it('should return default terminology when not configured', async () => {
      const { req, res } = mockReqRes();
      db.query.mockResolvedValueOnce({ rows: [{ settings: {} }] });

      await ctrl.getFellowshipSettings(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            systemName: 'House Fellowship',
            singularTerm: 'Fellowship Center',
            pluralTerm: 'Fellowship Centers',
          }),
        })
      );
    });
  });

  describe('createCenter', () => {
    it('should reject when name or host address is missing', async () => {
      const { req, res } = mockReqRes({ body: { name: 'Only Name' } });
      await ctrl.createCenter(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should insert center and return 201', async () => {
      const { req, res } = mockReqRes({
        body: {
          name: 'Living Water Cell',
          hostAddress: '14 Admiralty Way, Lekki Phase 1',
          meetingDay: 'Wednesday',
        },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'center-1',
          name: 'Living Water Cell',
          host_address: '14 Admiralty Way, Lekki Phase 1',
        }],
      });

      await ctrl.createCenter(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ name: 'Living Water Cell' }),
        })
      );
    });
  });

  describe('matchNearestCenters', () => {
    it('should calculate proximity scores and rank centers', async () => {
      const { req, res } = mockReqRes({
        body: {
          address: 'Admiralty Way Lekki Phase 1',
          city: 'Lagos',
        },
      });

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'c1',
            name: 'Lekki Admiralty Cell',
            host_address: '20 Admiralty Way Lekki Phase 1',
            city: 'Lagos',
            target_areas: ['Lekki'],
            member_count: 5,
            max_capacity: 15,
          },
          {
            id: 'c2',
            name: 'Ikeja GRA Cell',
            host_address: 'Isaac John Street Ikeja',
            city: 'Lagos',
            target_areas: ['Ikeja'],
            member_count: 8,
            max_capacity: 15,
          },
        ],
      });

      await ctrl.matchNearestCenters(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );

      const returned = res.json.mock.calls[0][0].data;
      expect(returned[0].id).toBe('c1');
      expect(returned[0].matchScore).toBeGreaterThan(returned[1].matchScore);
    });
  });
});
