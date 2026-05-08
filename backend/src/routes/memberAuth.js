const router = require('express').Router();
const c = require('../controllers/memberAuthController');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.post('/login', limiter, c.login);
router.post('/set-password', limiter, c.setPassword);

module.exports = router;
