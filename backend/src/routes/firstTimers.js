const express = require('express');
const router = express.Router();
const c = require('../controllers/firstTimersController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', c.getFirstTimerStats);
router.get('/', c.getFirstTimers);
router.post('/', authorize('super_admin', 'admin', 'pastor', 'staff'), c.createFirstTimer);
router.patch('/:id/follow-up', authorize('super_admin', 'admin', 'pastor', 'staff'), c.updateFollowUpStatus);
router.post('/:id/convert', authorize('super_admin', 'admin', 'pastor'), c.convertToMember);

module.exports = router;
