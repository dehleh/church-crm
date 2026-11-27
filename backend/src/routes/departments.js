const express = require('express');
const router = express.Router();
const c = require('../controllers/departmentsController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', authorize('admin', 'pastor', 'director', 'hod'), c.getDepartments);
router.post('/', authorize('admin', 'pastor', 'director'), [
  body('name').notEmpty().trim().escape(),
], handleValidationErrors, c.createDepartment);
router.put('/:id', authorize('admin', 'head_pastor', 'senior_pastor', 'pastor', 'director'), [
  body('name').optional().notEmpty().trim().escape(),
], handleValidationErrors, c.updateDepartment);
router.delete('/:id', authorize('admin', 'head_pastor', 'pastor', 'director'), c.deleteDepartment);
router.get('/:id/members', authorize('admin', 'pastor', 'director', 'hod'), c.getDepartmentMembers);
router.post('/:id/members', authorize('head_pastor', 'pastor', 'director', 'hod'), [
  body('memberId').notEmpty().isUUID(),
], handleValidationErrors, c.addMemberToDepartment);
router.delete('/:id/members/:memberId', authorize('head_pastor', 'pastor', 'director'), c.removeMemberFromDepartment);

// ── Department Pre-Service Checklists & Unit Readiness ────────
router.get('/presets', authorize('admin', 'pastor', 'director', 'hod'), c.getPresetTemplates);
router.get('/:id/checklists', authorize('admin', 'pastor', 'director', 'hod'), c.getDepartmentChecklists);
router.post('/:id/checklists', authorize('admin', 'pastor', 'director', 'hod'), [
  body('serviceTitle').notEmpty().trim(),
  body('serviceDate').notEmpty(),
], handleValidationErrors, c.createDepartmentChecklist);

router.get('/:id/checklists/:checklistId', authorize('admin', 'pastor', 'director', 'hod'), c.getChecklistDetails);
router.put('/:id/checklists/:checklistId', authorize('admin', 'pastor', 'director', 'hod'), c.updateDepartmentChecklist);
router.delete('/:id/checklists/:checklistId', authorize('admin', 'pastor', 'director', 'hod'), c.deleteDepartmentChecklist);

// Checklist items
router.post('/:id/checklists/:checklistId/items', authorize('admin', 'pastor', 'director', 'hod'), [
  body('title').notEmpty().trim(),
], handleValidationErrors, c.addChecklistItem);
router.put('/:id/checklists/:checklistId/items/:itemId', authorize('admin', 'pastor', 'director', 'hod'), c.updateChecklistItem);
router.delete('/:id/checklists/:checklistId/items/:itemId', authorize('admin', 'pastor', 'director', 'hod'), c.deleteChecklistItem);

// Broadcast checklist to all unit members
router.post('/:id/checklists/:checklistId/broadcast', authorize('admin', 'pastor', 'director', 'hod'), c.broadcastDepartmentChecklist);

// Reusable templates
router.get('/:id/checklist-templates', authorize('admin', 'pastor', 'director', 'hod'), c.getDepartmentChecklistTemplates);
router.post('/:id/checklist-templates', authorize('admin', 'pastor', 'director', 'hod'), [
  body('name').notEmpty().trim(),
  body('items').isArray(),
], handleValidationErrors, c.saveDepartmentChecklistTemplate);

module.exports = router;
