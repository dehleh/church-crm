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
  body().custom((value) => {
    if (!value.startDate && !value.startDatetime) {
      throw new Error('Start date/time is required');
    }
    return true;
  }),
], handleValidationErrors, c.createEvent);

router.put('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('title').optional().trim().escape(),
], handleValidationErrors, c.updateEvent);

router.delete('/:id', authorize('head_pastor', 'pastor', 'director'), c.deleteEvent);

router.post('/:id/remind', authorize('head_pastor', 'pastor', 'director', 'hod'), c.triggerEventReminder);

router.post('/:id/attendance', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('memberIds').isArray({ min: 1 }),
], handleValidationErrors, c.recordAttendance);
router.get('/:id/attendance', c.getEventAttendance);

module.exports = router;
