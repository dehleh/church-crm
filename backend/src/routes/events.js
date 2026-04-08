const express = require('express');
const router = express.Router();
const c = require('../controllers/eventsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/stats', c.getEventStats);
router.get('/', c.getEvents);
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('title').notEmpty().trim().escape(),
  body('eventType').notEmpty().trim(),
  body('startDate').notEmpty().isISO8601(),
], handleValidationErrors, c.createEvent);
router.post('/:id/attendance', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('memberIds').isArray({ min: 1 }),
], handleValidationErrors, c.recordAttendance);
router.get('/:id/attendance', c.getEventAttendance);

module.exports = router;
