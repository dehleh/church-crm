const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/contactController');

// Per-IP rate limit on the public submit (5 per hour)
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
});

router.post(
  '/',
  submitLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('church').optional({ nullable: true }).isString().isLength({ max: 200 }),
    body('message').trim().isLength({ min: 5, max: 4000 }),
    body('source').optional().isString().isLength({ max: 50 }),
    handleValidationErrors,
  ],
  ctrl.submitContact
);

// Admin views (super admin only)
router.get('/', authenticate, requireSuperAdmin, ctrl.listContacts);
router.patch(
  '/:id',
  authenticate,
  requireSuperAdmin,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'closed', 'spam']),
    body('notes').optional().isString().isLength({ max: 2000 }),
    handleValidationErrors,
  ],
  ctrl.updateContact
);

module.exports = router;
