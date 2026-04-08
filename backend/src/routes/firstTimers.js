const express = require('express');
const router = express.Router();
const c = require('../controllers/firstTimersController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', c.getFirstTimerStats);
router.get('/', c.getFirstTimers);
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), c.createFirstTimer);
router.patch('/:id/follow-up', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updateFollowUpStatus);
router.post('/:id/convert', authorize('head_pastor', 'pastor', 'director'), c.convertToMember);

module.exports = router;
