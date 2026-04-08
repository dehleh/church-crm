const express = require('express');
const router = express.Router();
const c = require('../controllers/prayerController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getPrayerRequests);
router.post('/', c.createPrayerRequest);
router.patch('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updatePrayerStatus);

module.exports = router;
