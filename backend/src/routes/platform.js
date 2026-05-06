const router = require('express').Router();
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/platformController');

router.use(authenticate, requireSuperAdmin);

router.get('/stats', ctrl.getPlatformStats);
router.get('/churches', ctrl.listChurches);
router.get('/churches/:id', ctrl.getChurch);
router.patch('/churches/:id/suspend', ctrl.suspendChurch);
router.patch('/churches/:id/activate', ctrl.activateChurch);
router.delete('/churches/:id', ctrl.deleteChurch);
router.get('/audit-log', ctrl.getAuditLog);

module.exports = router;
