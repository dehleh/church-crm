const express = require('express');
const router = express.Router();
const c = require('../controllers/groupsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getGroups);
router.post('/', authorize('head_pastor', 'pastor', 'director'), c.createGroup);
router.put('/:id', authorize('head_pastor', 'pastor', 'director'), c.updateGroup);
router.get('/:id/members', c.getGroupMembers);
router.post('/:id/members', authorize('head_pastor', 'pastor', 'director', 'hod'), c.addMemberToGroup);
router.delete('/:id/members/:memberId', authorize('head_pastor', 'pastor', 'director'), c.removeMemberFromGroup);

module.exports = router;
