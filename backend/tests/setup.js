// Test setup — runs before each test suite.
// Sets mock env vars so we don't need a real .env file for tests.

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'church_crm_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32chars!';
process.env.NODE_ENV = 'test';
