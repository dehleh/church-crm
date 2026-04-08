const express = require('express');
const router = express.Router();
const c = require('../controllers/followUpsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', c.getFollowUpStats);
router.get('/mine', c.getMyFollowUps);
router.get('/', c.getFollowUps);
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('memberId').notEmpty().isUUID(),
  body('type').notEmpty().trim(),
], handleValidationErrors, c.createFollowUp);
router.patch('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
], handleValidationErrors, c.updateFollowUp);

module.exports = router;
