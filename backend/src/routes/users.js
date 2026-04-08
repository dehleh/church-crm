const express = require('express');
const router = express.Router();
const c = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
router.use(authenticate);
router.get('/', authorize('head_pastor','pastor'), c.getUsers);
router.post('/', authorize('head_pastor','pastor'), [
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('role').notEmpty().isIn(['head_pastor', 'pastor', 'director', 'hod', 'member']),
], handleValidationErrors, c.inviteUser);
router.put('/:id', authorize('head_pastor','pastor'), [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('role').optional().isIn(['head_pastor', 'pastor', 'director', 'hod', 'member']),
], handleValidationErrors, c.updateUser);
router.post('/:id/reset-password', authorize('head_pastor','pastor'), c.resetUserPassword);
module.exports = router;
