/**
 * Environment variable validation — runs at startup.
 * Fails fast with a clear message if required vars are missing.
 */

const REQUIRED = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const OPTIONAL_DEFAULTS = {
  PORT: '5000',
  NODE_ENV: 'development',
  DB_PORT: '5432',
  APP_URL: 'http://localhost:3000',
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '30d',
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
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌  Missing required environment variables:\n');
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error('\nSet them in your .env file or system environment and restart.\n');
    process.exit(1);
  }

  // Apply optional defaults
  for (const [key, fallback] of Object.entries(OPTIONAL_DEFAULTS)) {
    if (!process.env[key]) process.env[key] = fallback;
  }
}

module.exports = { validateEnv };
