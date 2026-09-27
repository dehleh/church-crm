const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const devotionals = require('../controllers/devotionalsController');

router.use(authenticate);

router.get('/', authorize('admin', 'pastor', 'director', 'hod'), devotionals.getDevotionals);
router.get('/settings', authorize('admin', 'pastor'), devotionals.getDevotionalSettings);
router.put('/settings', authorize('admin'), devotionals.updateDevotionalSettings);
router.get('/date/:date', authorize('admin', 'pastor', 'director', 'hod'), devotionals.getDevotionalByDate);
router.get('/:id', authorize('admin', 'pastor', 'director', 'hod'), devotionals.getDevotional);
router.post('/', authorize('admin', 'pastor'), devotionals.createDevotional);
router.put('/:id', authorize('admin', 'pastor'), devotionals.updateDevotional);
router.delete('/:id', authorize('admin', 'pastor'), devotionals.deleteDevotional);
router.post('/:id/broadcast', authorize('admin', 'pastor'), devotionals.broadcastDevotional);
router.post('/seed-samples', authorize('admin'), devotionals.seedSampleDevotionals);

module.exports = router;
