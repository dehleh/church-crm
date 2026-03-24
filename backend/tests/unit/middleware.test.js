/**
 * Middleware unit tests — auth, validation, error handling.
 */

require('../setup');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { on: jest.fn() },
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(),
  stream: { write: jest.fn() },
}));

const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../src/middleware/auth');
const db = require('../../src/config/database');

function mockReqRes() {
  const req = { headers: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('should return 401 without Authorization header', async () => {
    const { req, res, next } = mockReqRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid token', async () => {
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Bearer invalid-token';
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next() with valid token and active user', async () => {
    const { req, res, next } = mockReqRes();
    const token = jwt.sign({ userId: 'u1', churchId: 'c1', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    req.headers.authorization = `Bearer ${token}`;

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'u1', church_id: 'c1', role: 'admin',
        is_active: true, church_active: true,
      }],
    });

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.churchId).toBe('c1');
  });

  it('should return 401 for inactive user', async () => {
    const { req, res, next } = mockReqRes();
    const token = jwt.sign({ userId: 'u1', churchId: 'c1', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    req.headers.authorization = `Bearer ${token}`;

    db.query.mockResolvedValueOnce({ rows: [] }); // user not found / inactive

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authorize middleware', () => {
  it('should allow authorized role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'super_admin' };
    authorize('super_admin', 'admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject unauthorized role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'viewer' };
    authorize('super_admin', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
