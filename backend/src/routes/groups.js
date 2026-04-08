const express = require('express');
const router = express.Router();
const c = require('../controllers/groupsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', c.getGroups);
router.post('/', authorize('head_pastor', 'pastor', 'director'), [
  body('name').notEmpty().trim().escape(),
  body('groupType').optional().trim(),
], handleValidationErrors, c.createGroup);
router.put('/:id', authorize('head_pastor', 'pastor', 'director'), [
  body('name').optional().trim().escape(),
], handleValidationErrors, c.updateGroup);
router.get('/:id/members', c.getGroupMembers);
router.post('/:id/members', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('memberId').notEmpty().isUUID(),
], handleValidationErrors, c.addMemberToGroup);
router.delete('/:id/members/:memberId', authorize('head_pastor', 'pastor', 'director'), c.removeMemberFromGroup);

module.exports = router;
