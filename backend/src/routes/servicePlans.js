const express = require('express');
const router = express.Router();
const c = require('../controllers/servicePlansController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// Volunteer Blockout Dates (must precede /:id)
router.get('/blockouts/list', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'member'), c.getBlockoutDates);
router.post('/blockouts', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'member'), c.addBlockoutDate);
router.delete('/blockouts/:id', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'member'), c.deleteBlockoutDate);

// Volunteer Swap Response (must precede /:id)
router.post('/swap-requests/:swapId/respond', authorize('head_pastor', 'pastor', 'director', 'hod', 'volunteer'), c.respondToVolunteerSwap);

// List and view service plans
router.get('/', authorize('admin', 'pastor', 'director', 'hod', 'member'), c.listServicePlans);
router.get('/:id', authorize('admin', 'pastor', 'director', 'hod', 'member'), c.getServicePlan);

// Live Service Mode & Cue Runner
router.get('/:id/live', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'member'), c.getLiveCueState);
router.post('/:id/live', authorize('head_pastor', 'pastor', 'director', 'hod', 'volunteer'), c.updateLiveCueState);

// Volunteer Swaps for Service Plan
router.post('/:id/swap-request', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'member'), c.requestVolunteerSwap);
router.get('/:id/swap-requests', authorize('admin', 'pastor', 'director', 'hod', 'volunteer', 'member'), c.listVolunteerSwapRequests);

// Manage service plans
router.post('/', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('title').notEmpty().trim().escape(),
  body('serviceDate').notEmpty(),
  body('startTime').notEmpty(),
], handleValidationErrors, c.createServicePlan);

router.put('/:id', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updateServicePlan);
router.delete('/:id', authorize('head_pastor', 'pastor', 'director'), c.deleteServicePlan);

// Run-sheet timeline
router.put('/:id/items', authorize('head_pastor', 'pastor', 'director', 'hod'), c.updateRunSheetItems);

// Volunteer roster
router.post('/:id/volunteers', authorize('head_pastor', 'pastor', 'director', 'hod'), c.addVolunteer);
router.delete('/:id/volunteers/:volunteerId', authorize('head_pastor', 'pastor', 'director', 'hod'), c.removeVolunteer);
router.patch('/:id/volunteers/:volunteerId/status', authorize('head_pastor', 'pastor', 'director', 'hod', 'member'), c.updateVolunteerStatus);
router.post('/:id/volunteers/remind', authorize('head_pastor', 'pastor', 'director', 'hod'), c.sendVolunteerReminders);

module.exports = router;
