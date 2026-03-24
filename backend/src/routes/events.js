const express = require('express');
const router = express.Router();
const c = require('../controllers/eventsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', c.getEventStats);
router.get('/', c.getEvents);
router.post('/', authorize('super_admin', 'admin', 'pastor', 'staff'), c.createEvent);
router.post('/:id/attendance', authorize('super_admin', 'admin', 'pastor', 'staff'), c.recordAttendance);
router.get('/:id/attendance', c.getEventAttendance);

module.exports = router;
