require('dotenv').config();
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ── Security & Middleware ────────────────────────────────────
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

// CORS — allow multiple origins (comma-separated APP_URL)
const allowedOrigins = (process.env.APP_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));
app.use(morgan(isProduction ? 'combined' : 'dev', { stream: logger.stream }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));

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
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/members',      require('./routes/members'));
app.use('/api/first-timers', require('./routes/firstTimers'));
app.use('/api/events',       require('./routes/events'));
app.use('/api/finance',      require('./routes/finance'));
app.use('/api/departments',  require('./routes/departments'));
app.use('/api/branches',     require('./routes/branches'));
app.use('/api/media',          require('./routes/media'));
app.use('/api/prayer',         require('./routes/prayer'));
app.use('/api/communications', require('./routes/communications'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/budgets',        require('./routes/budgets'));
app.use('/api/follow-ups',     require('./routes/followUps'));
app.use('/api/settings',       require('./routes/settings'));
app.use('/api/search',         require('./routes/search'));
app.use('/api/groups',         require('./routes/groups'));

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
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  const { pool } = require('./config/database');

  const server = app.listen(PORT, () => {
    logger.info(`⛪  ChurchOS API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
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
}

module.exports = app;
