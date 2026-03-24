const express = require('express');
const router = express.Router();
const c = require('../controllers/departmentsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getDepartments);
router.post('/', authorize('super_admin', 'admin', 'pastor'), c.createDepartment);
router.get('/:id/members', c.getDepartmentMembers);
router.post('/:id/members', authorize('super_admin', 'admin', 'pastor', 'staff'), c.addMemberToDepartment);
router.delete('/:id/members/:memberId', authorize('super_admin', 'admin', 'pastor'), c.removeMemberFromDepartment);

module.exports = router;
