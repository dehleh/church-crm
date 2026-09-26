const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fellowshipController');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// Settings / Terminology
router.get('/settings', ctrl.getFellowshipSettings);
router.put('/settings', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'super_admin'), ctrl.updateFellowshipSettings);

// Stats & Analytics
router.get('/stats', ctrl.getFellowshipStats);

// Zones / Districts
router.get('/zones', ctrl.getZones);
router.post('/zones', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'super_admin'), [
  body('name').notEmpty().trim(),
], handleValidationErrors, ctrl.createZone);
router.put('/zones/:id', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'super_admin'), ctrl.updateZone);

// Fellowship Centers
router.get('/centers', ctrl.getCenters);
router.post('/centers', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'hod', 'leader', 'super_admin'), [
  body('name').notEmpty().trim().withMessage('Center name is required'),
  body('hostAddress').custom((val, { req }) => {
    if (!val && !req.body.host_address) {
      throw new Error('Host address is required');
    }
    return true;
  }),
], handleValidationErrors, ctrl.createCenter);
router.get('/centers/:id', ctrl.getCenter);
router.put('/centers/:id', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'hod', 'leader', 'super_admin'), ctrl.updateCenter);

// Center Members & Proximity Matching
router.get('/centers/:id/members', ctrl.getCenterMembers);
router.post('/centers/:id/members', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'hod', 'leader', 'super_admin'), [
  body('memberId').notEmpty().isUUID(),
], handleValidationErrors, ctrl.addMemberToCenter);
router.delete('/centers/:id/members/:memberId', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'hod', 'leader', 'super_admin'), ctrl.removeMemberFromCenter);

router.get('/unassigned-members', ctrl.getUnassignedMembers);
router.post('/proximity-match', ctrl.matchNearestCenters);

// Weekly Reports
router.get('/reports', ctrl.getReports);
router.post('/reports', [
  body('centerId').notEmpty().isUUID(),
  body('meetingDate').notEmpty(),
], handleValidationErrors, ctrl.submitReport);

// Member Join Requests
router.get('/join-requests', ctrl.getJoinRequests);
router.patch('/join-requests/:id', authorize('head_pastor', 'pastor', 'admin', 'branch_pastor', 'branch_admin', 'director', 'hod', 'leader', 'super_admin'), [
  body('status').isIn(['approved', 'rejected']),
], handleValidationErrors, ctrl.reviewJoinRequest);

module.exports = router;
