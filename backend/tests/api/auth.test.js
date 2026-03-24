/**
 * Auth API integration tests.
 * Uses mocked database layer to avoid needing a real Postgres connection.
 */

// Load test env before anything else
require('../setup');

const request = require('supertest');

// Mock the database module before importing the app
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

// Mock logger to avoid file I/O during tests
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  stream: { write: jest.fn() },
}));

const app = require('../../src/index');
const db = require('../../src/config/database');
const bcrypt = require('bcryptjs');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid email', async () => {
      db.__mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const hash = await bcrypt.hash('correctpassword', 12);
      db.__mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1', church_id: 'church-1', email: 'admin@test.com',
          password_hash: hash, role: 'super_admin', is_active: true,
          church_active: true, first_name: 'John', last_name: 'Doe',
          church_name: 'Test Church', church_slug: 'test-church',
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      db.__mockQuery
        // SELECT user
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-1', church_id: 'church-1', email: 'admin@test.com',
            password_hash: hash, role: 'super_admin', is_active: true,
            church_active: true, first_name: 'John', last_name: 'Doe',
            church_name: 'Test Church', church_slug: 'test-church',
            branch_id: 'branch-1', avatar_url: null,
          }],
        })
        // UPDATE refresh token
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.firstName).toBe('John');
    });

    it('should return 403 for inactive user', async () => {
      const hash = await bcrypt.hash('password123', 12);
      db.__mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1', church_id: 'church-1', email: 'admin@test.com',
          password_hash: hash, role: 'admin', is_active: false,
          church_active: true, first_name: 'John', last_name: 'Doe',
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Account disabled');
    });

    it('should return 403 for suspended church', async () => {
      const hash = await bcrypt.hash('password123', 12);
      db.__mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1', church_id: 'church-1', email: 'admin@test.com',
          password_hash: hash, role: 'admin', is_active: true,
          church_active: false, first_name: 'John', last_name: 'Doe',
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Church account suspended');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 409 if slug is taken', async () => {
      db.__mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          churchName: 'My Church', churchSlug: 'taken-slug',
          adminFirstName: 'John', adminLastName: 'Doe',
          adminEmail: 'john@test.com', adminPassword: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('slug already taken');
    });

    it('should return 409 if email is taken', async () => {
      db.__mockQuery
        .mockResolvedValueOnce({ rows: [] }) // slug check — not taken
        .mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] }); // email check — taken

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          churchName: 'My Church', churchSlug: 'new-slug',
          adminFirstName: 'John', adminLastName: 'Doe',
          adminEmail: 'taken@test.com', adminPassword: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already registered');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
