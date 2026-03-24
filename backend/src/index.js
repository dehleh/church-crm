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

// ── Security & Middleware ────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));

// Serve frontend static build in production (Railway single-service deploy)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
}
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: logger.stream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

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

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  app: process.env.APP_NAME || 'ChurchOS',
  timestamp: new Date().toISOString()
}));

// Swagger API docs
const { setupSwagger } = require('./config/swagger');
setupSwagger(app);

// Serve frontend for any non-API route in production (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
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
  app.listen(PORT, () => {
    logger.info(`⛪  ChurchOS API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
