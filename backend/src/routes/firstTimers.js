const express = require('express');
const router = express.Router();
const c = require('../controllers/firstTimersController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', authorize('admin', 'pastor', 'director', 'hod'), c.getFirstTimerStats);
router.get('/', authorize('admin', 'pastor', 'director', 'hod'), c.getFirstTimers);
router.post('/', authorize('admin', 'pastor', 'director', 'hod'), [
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('phone').notEmpty().trim(),
  body('email').notEmpty().isEmail().normalizeEmail(),
  body('gender').notEmpty().isIn(['male', 'female']),
  body('visitDate').notEmpty(),
  body('howDidYouHear').notEmpty().trim(),
], handleValidationErrors, c.createFirstTimer);
router.put('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('firstName').optional().notEmpty().trim().escape(),
  body('lastName').optional().notEmpty().trim().escape(),
  body('phone').optional().trim(),
  body('email').optional({ values: 'null' }).isEmail().normalizeEmail(),
], handleValidationErrors, c.updateFirstTimer);
router.patch('/:id/follow-up', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('status').notEmpty().trim(),
], handleValidationErrors, c.updateFollowUpStatus);
router.post('/:id/convert', authorize('head_pastor', 'pastor', 'director'), c.convertToMember);

// Automated Follow-Up Sequences
router.get('/sequence/settings', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director', 'hod'), c.getSequenceSettings);
router.get('/sequence', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director', 'hod'), c.getSequenceSettings);
router.put('/sequence/settings', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director'), c.updateSequenceSettings);
router.put('/sequence', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director'), c.updateSequenceSettings);
router.get('/:id/sequence-queue', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director', 'hod'), c.getFirstTimerQueue);
router.get('/:id/queue', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director', 'hod'), c.getFirstTimerQueue);
router.post('/:id/cancel-sequence', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director'), c.cancelFirstTimerSequence);
router.post('/:id/trigger-sequence', authorize('admin', 'superadmin', 'head_pastor', 'pastor', 'director'), c.triggerFirstTimerSequence);

// CSV Import
const csv = require('../controllers/csvImportController');
router.post('/import', authorize('head_pastor', 'pastor', 'director', 'hod'), csv.importFirstTimers);

module.exports = router;
