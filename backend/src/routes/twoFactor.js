const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/twoFactorController');

// Public route to verify 2FA during login
router.post(
  '/verify-login',
  [
    body('twoFactorToken').notEmpty().withMessage('2FA session token is required'),
    body('code').notEmpty().withMessage('Verification code is required'),
    handleValidationErrors,
  ],
  ctrl.verify2FALogin
);

// Authenticated user 2FA management routes
router.use(authenticate);

router.get('/status', ctrl.get2FAStatus);
router.post('/setup', ctrl.setup2FA);
router.post(
  '/enable',
  [
    body('code').notEmpty().withMessage('6-digit verification code is required'),
    handleValidationErrors,
  ],
  ctrl.enable2FA
);
router.post(
  '/disable',
  [
    body('password').notEmpty().withMessage('Password is required to disable 2FA'),
    body('code').notEmpty().withMessage('2FA or backup code is required'),
    handleValidationErrors,
  ],
  ctrl.disable2FA
);

module.exports = router;
