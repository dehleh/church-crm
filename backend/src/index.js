require('dotenv').config();
// ChurchOS backend v1.4
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./config/logger');

// Optional Sentry init (only if DSN provided)
let Sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
    logger.info('Sentry error tracking enabled');
  } catch (e) {
    logger.warn('Sentry DSN set but @sentry/node not installed; skipping');
    Sentry = null;
  }
}

const app = express();
if (Sentry) {
  app.use(Sentry.Handlers.requestHandler());
}
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy (Railway, Render, etc. run behind a reverse proxy)
if (isProduction) {
  app.set('trust proxy', 1);
}

// ── Security & Middleware ────────────────────────────────────
const compression = require('compression');
app.use(compression());

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  } : false,
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  crossOriginEmbedderPolicy: false,
}));

// HTTPS redirect in production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// CORS — allow multiple origins (comma-separated APP_URL) + trusted hostnames
const allowedOrigins = (process.env.APP_URL || 'http://localhost:3000,http://localhost:5173,https://cos.themobilemissionary.org')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isAllowedCorsOrigin = (origin) => {
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return true;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    if (parsed.protocol === 'https:') {
      // Allow core platform domains, railway subdomains, and church custom domains
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isAllowedCorsOrigin(origin)) {
      return cb(null, true);
    }
    logger.warn(`Blocked by CORS: ${origin}`);
    cb(null, false);
  },
  credentials: true
}));
app.use(morgan(isProduction ? 'combined' : 'dev', { stream: logger.stream }));
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (from attached Railway persistent volume or local uploads folder)
const persistentUploadDir = path.resolve(process.env.UPLOAD_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || 'uploads');
if (!fs.existsSync(persistentUploadDir)) {
  fs.mkdirSync(persistentUploadDir, { recursive: true });
}
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    next();
  },
  express.static(persistentUploadDir, {
    maxAge: '7d',
    immutable: true,
  })
);

// Rate limiting — global
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);

// Auth rate limiting — stricter per-IP, with slow-down
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/2fa/verify-login', authLimiter);

// Sanitize pagination query params globally
app.use('/api/', (req, res, next) => {
  if (req.query.page) {
    req.query.page = Math.max(1, parseInt(req.query.page, 10) || 1);
  }
  if (req.query.limit) {
    const limit = parseInt(req.query.limit, 10) || 20;
    req.query.limit = Math.min(Math.max(1, limit), 100);
  }
  next();
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/license', require('./routes/license'));
app.use('/api/public', require('./routes/public'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/members', require('./routes/members'));
app.use('/api/first-timers', require('./routes/firstTimers'));
app.use('/api/events', require('./routes/events'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/media', require('./routes/media'));
app.use('/api/prayer', require('./routes/prayer'));
app.use('/api/communications', require('./routes/communications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/follow-ups', require('./routes/followUps'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/search', require('./routes/search'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/counseling', require('./routes/counseling'));
app.use('/api/welfare', require('./routes/welfare'));
app.use('/api/procurement', require('./routes/procurement'));
app.use('/api/platform', require('./routes/platform'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/member-auth', require('./routes/memberAuth'));
app.use('/api/me', require('./routes/memberPortal'));
app.use('/api/fellowship', require('./routes/fellowship'));
app.use('/api/discipleship', require('./routes/discipleship'));
app.use('/api/devotionals', require('./routes/devotionals'));
app.use('/api/giving', require('./routes/giving'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/auth/2fa', require('./routes/twoFactor'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/service-plans', require('./routes/servicePlans'));

// Initialize background job queue (BullMQ if REDIS_URL set, in-process otherwise).
// Importing csvImportController here also registers the CSV processors.
const { initQueue } = require('./queue');
require('./controllers/csvImportController');
initQueue();

// Initialize automated broadcast and event reminder scheduler
const { initScheduler, stopScheduler } = require('./services/schedulerService');

// Health check — with DB verification
const { healthCheck } = require('./config/database');
app.get('/health', async (req, res) => {
  const dbOk = await healthCheck();
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    app: process.env.APP_NAME || 'ChurchOS',
    timestamp: new Date().toISOString(),
    db: dbOk ? 'connected' : 'unreachable',
  });
});

// Swagger API docs — only in non-production or when explicitly enabled
if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
  const { setupSwagger } = require('./config/swagger');
  setupSwagger(app);
}

// Serve frontend static build in production (single-service deploy)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ── Error Handling ───────────────────────────────────────────
const { notFound, errorHandler } = require('./middleware/errorHandler');
app.use(notFound);
if (Sentry) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  const { pool } = require('./config/database');
  const { runMigrations } = require('./migrations/run');

  (async () => {
    try {
      if (process.env.AUTO_MIGRATE !== 'false') {
        logger.info('Applying pending database migrations...');
        await runMigrations({ closePool: false });
      }

      // Auto-provision or verify platform super admin credentials
      const { ensureSuperAdmin } = require('./scripts/initSuperAdmin');
      await ensureSuperAdmin();
    } catch (err) {
      logger.error('Database initialization failed during startup', { error: err.message });
      process.exit(1);
    }

    initScheduler();

    const server = app.listen(PORT, () => {
      logger.info(`⛪  ChurchOS API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      stopScheduler();
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await pool.end();
          logger.info('Database pool closed');
        } catch (err) {
          logger.error('Error closing database pool', err);
        }
        process.exit(0);
      });
      // Force exit after 30s if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', { reason: reason?.stack || reason });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
      setTimeout(() => process.exit(1), 1000);
    });
  })();
}

module.exports = app;
