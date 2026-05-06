const router = require('express').Router();
const { param, body } = require('express-validator');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const ctrl = require('../controllers/platformController');

router.use(authenticate, requireSuperAdmin);

const idParam = [param('id').isUUID(), handleValidationErrors];

router.get('/stats', ctrl.getPlatformStats);
router.get('/churches', ctrl.listChurches);
router.get('/churches/:id', idParam, ctrl.getChurch);
router.patch('/churches/:id/suspend', idParam,
  [body('reason').optional().isString().isLength({ max: 500 }), handleValidationErrors],
  ctrl.suspendChurch);
router.patch('/churches/:id/activate', idParam, ctrl.activateChurch);
router.delete('/churches/:id', idParam, ctrl.deleteChurch);
router.get('/audit-log', ctrl.getAuditLog);

module.exports = router;
