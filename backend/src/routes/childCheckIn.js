const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/childCheckInController');

router.use(authenticate);

// ── Child Safety & Check-In Endpoints ────────────────────────
router.get('/', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'finance'), ctrl.listChildCheckIns);
router.post('/', authorize('admin', 'pastor', 'director', 'hod', 'volunteer'), ctrl.checkInChild);
router.post('/:id/checkout', authorize('admin', 'pastor', 'director', 'hod', 'volunteer'), ctrl.checkOutChild);
router.post('/:id/page-parent', authorize('admin', 'pastor', 'director', 'hod', 'volunteer'), ctrl.pageParent);

module.exports = router;
