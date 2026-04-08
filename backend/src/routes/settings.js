const express = require('express');
const router = express.Router();
const c = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', c.getChurchSettings);
router.get('/stats', c.getChurchStats);
router.put('/church', authorize('head_pastor', 'pastor'), [
  body('name').optional().trim().escape(),
], handleValidationErrors, c.updateChurchSettings);
router.put('/profile', [
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('email').optional().isEmail().normalizeEmail(),
], handleValidationErrors, c.updateProfile);
router.post('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], handleValidationErrors, c.changePassword);

module.exports = router;
