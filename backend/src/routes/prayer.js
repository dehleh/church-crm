const express = require('express');
const router = express.Router();
const c = require('../controllers/prayerController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', c.getPrayerRequests);
router.post('/', [
  body('title').notEmpty().trim().escape(),
  body('description').optional().trim(),
], handleValidationErrors, c.createPrayerRequest);
router.patch('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('status').notEmpty().isIn(['pending', 'praying', 'answered', 'closed']),
], handleValidationErrors, c.updatePrayerStatus);

module.exports = router;
