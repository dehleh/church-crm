const express = require('express');
const router = express.Router();
const c = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
router.use(authenticate);
router.get('/', authorize('admin'), c.getUsers);
router.post('/', authorize('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('role').notEmpty().isIn(['head_pastor', 'admin', 'pastor', 'director', 'finance', 'hod', 'branch_pastor', 'branch_admin', 'member']),
], handleValidationErrors, c.inviteUser);
router.put('/:id', authorize('admin'), [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('role').optional().isIn(['head_pastor', 'admin', 'pastor', 'director', 'finance', 'hod', 'branch_pastor', 'branch_admin', 'member']),
], handleValidationErrors, c.updateUser);
router.post('/:id/reset-password', authorize('admin'), c.resetUserPassword);
module.exports = router;
