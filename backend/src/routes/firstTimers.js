const express = require('express');
const router = express.Router();
const c = require('../controllers/firstTimersController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', c.getFirstTimerStats);
router.get('/', c.getFirstTimers);
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('phone').optional().trim(),
  body('email').optional({ values: 'null' }).isEmail().normalizeEmail(),
], handleValidationErrors, c.createFirstTimer);
router.patch('/:id/follow-up', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('status').notEmpty().trim(),
], handleValidationErrors, c.updateFollowUpStatus);
router.post('/:id/convert', authorize('head_pastor', 'pastor', 'director'), c.convertToMember);

module.exports = router;
