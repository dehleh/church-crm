const express = require('express');
const router = express.Router();
const c = require('../controllers/testimonyController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/stats', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.getTestimonyStats);
router.get('/', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.getTestimonies);
router.get('/:id', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.getTestimony);

// Any authenticated staff or member can submit a testimony
router.post('/', [
  body('title').notEmpty().trim().escape(),
  body('content').notEmpty().trim(),
], handleValidationErrors, c.submitTestimony);

// Pastoral approval workflow (Senior Pastor, Head Pastor, Pastor)
router.put('/:id/review', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor'), [
  body('status').optional().isIn(['pending_review', 'approved_for_service', 'approved_online', 'shared_in_service', 'rejected', 'archived']),
], handleValidationErrors, c.reviewTestimony);

router.delete('/:id', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor'), c.deleteTestimony);

module.exports = router;
