const express = require('express');
const router = express.Router();
const c = require('../controllers/budgetController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

// Summary & Retrieval
router.get('/summary/overview', authorize('admin', 'pastor', 'director', 'hod', 'finance'), c.getBudgetSummary);
router.get('/', authorize('admin', 'pastor', 'director', 'hod', 'finance'), c.getBudgets);
router.get('/:id', authorize('admin', 'pastor', 'director', 'hod', 'finance'), c.getBudgetById);

// Create & Edit
router.post('/', authorize('admin', 'pastor', 'director', 'hod', 'finance'), [
  body('name').notEmpty().trim().escape(),
], handleValidationErrors, c.createBudget);

router.put('/:id', authorize('admin', 'pastor', 'director', 'hod', 'finance'), [
  body('name').optional().trim().escape(),
], handleValidationErrors, c.updateBudget);

// Approval Workflow
router.post('/:id/submit', authorize('admin', 'pastor', 'director', 'hod', 'finance'), c.submitBudget);
router.post('/:id/approve', authorize('admin', 'pastor', 'finance'), c.approveBudget);
router.post('/:id/reject', authorize('admin', 'pastor', 'finance'), c.rejectBudget);

// Delete
router.delete('/:id', authorize('admin', 'pastor', 'director', 'hod', 'finance'), c.deleteBudget);

module.exports = router;
