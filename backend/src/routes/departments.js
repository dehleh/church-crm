const express = require('express');
const router = express.Router();
const c = require('../controllers/departmentsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', c.getDepartments);
router.post('/', authorize('head_pastor', 'pastor', 'director'), [
  body('name').notEmpty().trim().escape(),
], handleValidationErrors, c.createDepartment);
router.get('/:id/members', c.getDepartmentMembers);
router.post('/:id/members', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('memberId').notEmpty().isUUID(),
], handleValidationErrors, c.addMemberToDepartment);
router.delete('/:id/members/:memberId', authorize('head_pastor', 'pastor', 'director'), c.removeMemberFromDepartment);

module.exports = router;
