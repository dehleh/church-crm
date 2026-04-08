const express = require('express');
const router = express.Router();
const c = require('../controllers/eventsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', c.getEventStats);
router.get('/', c.getEvents);
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), c.createEvent);
router.post('/:id/attendance', authorize('head_pastor', 'pastor', 'director', 'hod'), c.recordAttendance);
router.get('/:id/attendance', c.getEventAttendance);

module.exports = router;
