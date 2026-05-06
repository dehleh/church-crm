const router = require('express').Router();
const { param, body } = require('express-validator');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/platformController');

router.use(authenticate, requireSuperAdmin);

const idParam = [param('id').isUUID(), handleValidationErrors];

router.get('/stats', ctrl.getPlatformStats);
router.get('/churches', ctrl.listChurches);
router.post('/churches', [
  body('churchName').isString().trim().isLength({ min: 2, max: 200 }),
  body('churchSlug').isString().trim().toLowerCase().matches(/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/)
    .withMessage('Slug must be 1-50 chars: lowercase letters, numbers, hyphens'),
  body('denomination').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  body('adminFirstName').isString().trim().isLength({ min: 1, max: 100 }),
  body('adminLastName').isString().trim().isLength({ min: 1, max: 100 }),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPhone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 30 }),
  body('adminPassword').optional({ values: 'falsy' }).isLength({ min: 8, max: 128 }),
  handleValidationErrors,
], ctrl.createChurch);
router.get('/churches/:id', idParam, ctrl.getChurch);
router.patch('/churches/:id/suspend', idParam,
  [body('reason').optional().isString().isLength({ max: 500 }), handleValidationErrors],
  ctrl.suspendChurch);
router.patch('/churches/:id/activate', idParam, ctrl.activateChurch);
router.delete('/churches/:id', idParam, ctrl.deleteChurch);
router.get('/audit-log', ctrl.getAuditLog);

module.exports = router;
