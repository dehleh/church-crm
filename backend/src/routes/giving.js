const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/givingController');

// ── Public Online Giving Routes ──────────────────────────────
router.get('/public/:slug/info', ctrl.getPublicGivingInfo);

router.post(
  '/public/initialize',
  [
    body('amount').isNumeric().withMessage('Amount must be a positive number'),
    handleValidationErrors,
  ],
  ctrl.initializeGiving
);

router.get('/public/verify/:reference', ctrl.verifyGiving);

// ── Authenticated Church Staff Routes ─────────────────────────
router.get(
  '/transactions',
  authenticate,
  authorize('admin', 'pastor', 'finance'),
  ctrl.listGivingTransactions
);

module.exports = router;
