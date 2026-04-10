const express = require('express');
const router = express.Router();
const c = require('../controllers/prayerController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', c.getPrayerRequests);
router.post('/', [
  body('request').notEmpty().trim(),
  body('category').optional().trim(),
  body('requesterName').optional().trim().escape(),
  body('isAnonymous').optional().isBoolean(),
], handleValidationErrors, c.createPrayerRequest);
router.patch('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('status').notEmpty().isIn(['open', 'praying', 'answered', 'closed']),
], handleValidationErrors, c.updatePrayerStatus);

module.exports = router;
