const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config();

// Support Railway's DATABASE_URL or individual env vars
const isProduction = process.env.NODE_ENV === 'production';
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'church_crm',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...poolConfig,
  max: parseInt(process.env.DB_POOL_MAX) || 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  return res;
};

const getClient = () => pool.connect();

const healthCheck = async () => {
  const res = await pool.query('SELECT 1');
  return !!res;
};

module.exports = { query, getClient, pool, healthCheck };
