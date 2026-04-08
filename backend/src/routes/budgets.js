const express = require('express');
const router = express.Router();
const c = require('../controllers/budgetController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
router.use(authenticate);
router.get('/', c.getBudgets);
router.post('/', authorize('head_pastor','pastor'), [
  body('name').notEmpty().trim().escape(),
  body('totalAmount').isFloat({ gt: 0 }),
  body('startDate').notEmpty().isISO8601(),
  body('endDate').notEmpty().isISO8601(),
], handleValidationErrors, c.createBudget);
router.put('/:id', authorize('head_pastor','pastor'), [
  body('name').optional().trim().escape(),
  body('totalAmount').optional().isFloat({ gt: 0 }),
], handleValidationErrors, c.updateBudget);
module.exports = router;
