const express = require('express');
const router = express.Router();
const c = require('../controllers/followUpsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', c.getFollowUpStats);
router.get('/mine', c.getMyFollowUps);
router.get('/', c.getFollowUps);
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), c.createFollowUp);
router.patch('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updateFollowUp);

module.exports = router;
