const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/licenseController');
const rateLimit = require('express-rate-limit');

// Modest abuse protection on the public form
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

router.post('/request', submitLimiter, ctrl.submitLicenseRequest);

module.exports = router;
