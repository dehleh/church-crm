/**
 * Environment variable validation — runs at startup.
 * Fails fast with a clear message if required vars are missing.
 */

// DATABASE_URL (Railway) can replace individual DB_* vars
const DB_REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const ALWAYS_REQUIRED = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

const OPTIONAL_DEFAULTS = {
  PORT: '5000',
  NODE_ENV: 'development',
  DB_PORT: '5432',
  APP_URL: 'http://localhost:3000',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  APP_NAME: 'ChurchOS',
  SMTP_HOST: '',
  SMTP_PORT: '587',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: 'noreply@churchos.app',
  SMS_PROVIDER: '',
  TWILIO_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_PHONE: '',
  UPLOAD_DIR: 'uploads',
  MAX_FILE_SIZE_MB: '50',
};

function validateEnv() {
  const hasDbUrl = !!process.env.DATABASE_URL;
  const required = hasDbUrl ? ALWAYS_REQUIRED : [...ALWAYS_REQUIRED, ...DB_REQUIRED];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌  Missing required environment variables:\n');
    missing.forEach((key) => console.error(`   • ${key}`));
    if (!hasDbUrl) console.error('   (or set DATABASE_URL instead of individual DB_* vars)');
    console.error('\nSet them in your .env file or system environment and restart.\n');
    process.exit(1);
  }

  // Apply optional defaults
  for (const [key, fallback] of Object.entries(OPTIONAL_DEFAULTS)) {
    if (!process.env[key]) process.env[key] = fallback;
  }
}

module.exports = { validateEnv };
