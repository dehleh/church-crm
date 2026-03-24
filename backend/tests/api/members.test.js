/**
 * Members API integration tests.
 */

require('../setup');

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/database', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    getClient: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    pool: { on: jest.fn() },
    __mockQuery: mockQuery,
  };
});

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(),
  stream: { write: jest.fn() },
}));

const app = require('../../src/index');
const db = require('../../src/config/database');

// Helper: generate a valid JWT for test requests
function authToken(userId = 'user-1', churchId = 'church-1', role = 'super_admin') {
  return jwt.sign({ userId, churchId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Members API', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockUser = {
    id: 'user-1', church_id: 'church-1', role: 'super_admin',
    is_active: true, church_active: true, first_name: 'Admin', last_name: 'User',
    church_name: 'Test', church_slug: 'test',
  };

  describe('GET /api/members', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/members');
      expect(res.status).toBe(401);
    });

    it('should return members list', async () => {
      db.__mockQuery
        // Auth middleware — user lookup
        .mockResolvedValueOnce({ rows: [mockUser] })
        // COUNT query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        // SELECT members
        .mockResolvedValueOnce({
          rows: [
            { id: 'm1', first_name: 'John', last_name: 'Doe', membership_status: 'active' },
            { id: 'm2', first_name: 'Jane', last_name: 'Doe', membership_status: 'active' },
          ],
        });

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('GET /api/members/:id', () => {
    it('should return 404 for non-existent member', async () => {
      db.__mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // auth
        .mockResolvedValueOnce({ rows: [] }); // member query

      const res = await request(app)
        .get('/api/members/nonexistent')
        .set('Authorization', `Bearer ${authToken()}`);

      expect(res.status).toBe(404);
    });

    it('should return a single member', async () => {
      db.__mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({
          rows: [{ id: 'm1', first_name: 'John', last_name: 'Doe', departments: [] }],
        });

      const res = await request(app)
        .get('/api/members/m1')
        .set('Authorization', `Bearer ${authToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('John');
    });
  });

  describe('POST /api/members', () => {
    it('should create a member', async () => {
      db.__mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // auth
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // member count
        .mockResolvedValueOnce({
          rows: [{ id: 'new-1', member_number: 'MBR-00006', first_name: 'New', last_name: 'Member' }],
        });

      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ firstName: 'New', lastName: 'Member' });

      expect(res.status).toBe(201);
      expect(res.body.data.member_number).toBe('MBR-00006');
    });
  });

  describe('DELETE /api/members/:id', () => {
    it('should soft-delete (deactivate) a member', async () => {
      db.__mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

      const res = await request(app)
        .delete('/api/members/m1')
        .set('Authorization', `Bearer ${authToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Member deactivated');
    });
  });

  describe('GET /api/members/stats', () => {
    it('should return member stats', async () => {
      db.__mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({
          rows: [{ active: '50', inactive: '5', male: '30', female: '25', new_this_month: '3' }],
        });

      const res = await request(app)
        .get('/api/members/stats')
        .set('Authorization', `Bearer ${authToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.active).toBe('50');
    });
  });
});
