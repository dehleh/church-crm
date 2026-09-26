const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const devotionals = require('../controllers/devotionalsController');

router.use(authenticate);


router.get('/', devotionals.getDevotionals);
router.get('/settings', devotionals.getDevotionalSettings);
router.put('/settings', devotionals.updateDevotionalSettings);
router.get('/date/:date', devotionals.getDevotionalByDate);
router.get('/:id', devotionals.getDevotional);
router.post('/', devotionals.createDevotional);
router.put('/:id', devotionals.updateDevotional);
router.delete('/:id', devotionals.deleteDevotional);
router.post('/:id/broadcast', devotionals.broadcastDevotional);
router.post('/seed-samples', devotionals.seedSampleDevotionals);

module.exports = router;
