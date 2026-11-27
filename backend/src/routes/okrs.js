const express = require('express');
const router = express.Router();
const c = require('../controllers/okrController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// List OKRs and scorecards
router.get('/', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.getOkrs);
router.get('/scorecard', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.getPerformanceScorecard);

// Create and edit OKRs (Senior leadership)
router.post('/', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor'), [
  body('userId').notEmpty().isUUID(),
  body('title').notEmpty().trim(),
], handleValidationErrors, c.createOkr);

router.put('/:id', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor'), c.updateOkr);

// Staff progress self-reporting
router.patch('/:id/progress', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director', 'hod'), c.updateProgress);

// Senior Pastor review
router.patch('/:id/review', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor'), c.reviewOkr);

// Delete OKR
router.delete('/:id', authorize('admin', 'senior_pastor', 'head_pastor'), c.deleteOkr);

module.exports = router;
