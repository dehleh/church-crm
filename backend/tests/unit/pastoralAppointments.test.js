/**
 * Pastoral Appointments / Summons unit tests.
 */
require('../setup');

jest.mock('../../src/config/database', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    healthCheck: jest.fn().mockResolvedValue(true),
    pool: { on: jest.fn(), end: jest.fn().mockResolvedValue() },
    __mockQuery: mockQuery,
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
  sendSMS: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  sendWhatsApp: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  normalizePhoneNumber: jest.fn(n => n),
}));

const db = require('../../src/config/database');
const ctrl = require('../../src/controllers/pastoralAppointmentsController');

function mockReqRes(reqData = {}) {
  const req = {
    churchId: 'church-1',
    user: { id: 'user-1', first_name: 'Pastor', last_name: 'David' },
    member: { id: 'member-1' },
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

describe('Pastoral Appointments & Summons Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAppointment', () => {
    it('should reject if meetingTime is missing', async () => {
      const { req, res } = mockReqRes({
        body: { memberIds: ['m1'] },
      });

      await ctrl.createAppointment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Meeting date and time are required' }));
    });

    it('should reject if no member is specified', async () => {
      const { req, res } = mockReqRes({
        body: { meetingTime: '2026-11-20T14:00:00Z' },
      });

      await ctrl.createAppointment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'At least one member must be selected' }));
    });

    it('should create appointments for members and return 201', async () => {
      const { req, res } = mockReqRes({
        body: {
          memberIds: ['m1', 'm2'],
          meetingTime: '2026-11-20T14:00:00Z',
          venue: "Senior Pastor's Office",
          urgency: 'high',
          notes: 'Discuss department leadership transition',
          sendWhatsApp: true,
          sendSms: false,
        },
      });

      // 1. Members lookup
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'm1', first_name: 'John', last_name: 'Doe', phone: '+2348011111111' },
          { id: 'm2', first_name: 'Jane', last_name: 'Smith', phone: '+2348022222222' },
        ],
      });

      // 2. Church lookup
      db.query.mockResolvedValueOnce({
        rows: [{ name: 'Grace Sanctuary', settings: {} }],
      });

      // 3. Insert m1
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'appt-1',
          church_id: 'church-1',
          member_id: 'm1',
          pastor_name: 'Pastor David',
          meeting_time: new Date('2026-11-20T14:00:00Z'),
          venue: "Senior Pastor's Office",
          urgency: 'high',
          status: 'pending',
        }],
      });

      // 4. Insert m2
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'appt-2',
          church_id: 'church-1',
          member_id: 'm2',
          pastor_name: 'Pastor David',
          meeting_time: new Date('2026-11-20T14:00:00Z'),
          venue: "Senior Pastor's Office",
          urgency: 'high',
          status: 'pending',
        }],
      });

      await ctrl.createAppointment(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 2,
      }));
    });
  });

  describe('listAppointments', () => {
    it('should return list of appointments with member details', async () => {
      const { req, res } = mockReqRes({
        query: { status: 'pending' },
      });

      db.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count query
        .mockResolvedValueOnce({
          rows: [{
            id: 'appt-1',
            pastor_name: 'Pastor David',
            member_name: 'John Doe',
            member_phone: '+2348011111111',
            meeting_time: '2026-11-20T14:00:00Z',
            venue: "Senior Pastor's Office",
            status: 'pending',
          }],
        }); // data query

      await ctrl.listAppointments(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ total: 1 }),
      }));
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status to acknowledged', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'appt-1' },
        body: { status: 'acknowledged' },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'appt-1',
          status: 'acknowledged',
          acknowledged_at: new Date(),
        }],
      });

      await ctrl.updateAppointmentStatus(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: 'acknowledged' }),
      }));
    });

    it('should reject invalid status', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'appt-1' },
        body: { status: 'flying' },
      });

      await ctrl.updateAppointmentStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Member Portal: getMyPastoralAppointments and acknowledgeMyAppointment', () => {
    it('should retrieve member pastoral appointments', async () => {
      const { req, res } = mockReqRes();

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'appt-1',
          pastor_name: 'Pastor David',
          meeting_time: '2026-11-20T14:00:00Z',
          venue: "Pastor's Office",
          status: 'pending',
        }],
      });

      await ctrl.getMyPastoralAppointments(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'appt-1', status: 'pending' }),
        ]),
      }));
    });

    it('should allow member to acknowledge appointment', async () => {
      const { req, res } = mockReqRes({
        params: { id: 'appt-1' },
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'appt-1',
          member_id: 'member-1',
          status: 'acknowledged',
          acknowledged_at: new Date(),
        }],
      });

      await ctrl.acknowledgeMyAppointment(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: 'acknowledged' }),
      }));
    });
  });
});
