const express = require('express');
const router = express.Router();
const c = require('../controllers/departmentsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getDepartments);
router.post('/', authorize('head_pastor', 'pastor', 'director'), c.createDepartment);
router.get('/:id/members', c.getDepartmentMembers);
router.post('/:id/members', authorize('head_pastor', 'pastor', 'director', 'hod'), c.addMemberToDepartment);
router.delete('/:id/members/:memberId', authorize('head_pastor', 'pastor', 'director'), c.removeMemberFromDepartment);

module.exports = router;
