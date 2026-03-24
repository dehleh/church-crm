const express = require('express');
const router = express.Router();
const c = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getChurchSettings);
router.get('/stats', c.getChurchStats);
router.put('/church', authorize('super_admin', 'admin'), c.updateChurchSettings);
router.put('/profile', c.updateProfile);
router.post('/change-password', c.changePassword);

module.exports = router;
