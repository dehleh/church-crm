// finance.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/financeController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);

/**
 * @swagger
 * /finance/summary:
 *   get:
 *     tags: [Finance]
 *     summary: Financial summary with trends
 *     parameters:
 *       - { in: query, name: period, schema: { type: string, enum: [week, month, year], default: month } }
 *     responses:
 *       200: { description: Financial summary }
 */
router.get('/summary', c.getFinanceSummary);

/**
 * @swagger
 * /finance/transactions:
 *   get:
 *     tags: [Finance]
 *     summary: List transactions with filters
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: type, schema: { type: string, enum: [income, expense] } }
 *       - { in: query, name: startDate, schema: { type: string, format: date } }
 *       - { in: query, name: endDate, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Paginated transactions }
 *   post:
 *     tags: [Finance]
 *     summary: Record a new transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionType, amount]
 *             properties:
 *               transactionType: { type: string, enum: [income, expense] }
 *               amount: { type: number }
 *               accountId: { type: string, format: uuid }
 *               categoryId: { type: string, format: uuid }
 *               paymentMethod: { type: string, enum: [cash, transfer, card, cheque, ussd] }
 *     responses:
 *       201: { description: Transaction created }
 */
router.get('/transactions', c.getTransactions);
router.post('/transactions', authorize('head_pastor', 'pastor', 'hod'), [
  body('transactionType').notEmpty().isIn(['income', 'expense']),
  body('amount').isFloat({ gt: 0 }),
  body('paymentMethod').optional().isIn(['cash', 'transfer', 'card', 'cheque', 'ussd']),
], handleValidationErrors, c.createTransaction);

/**
 * @swagger
 * /finance/accounts:
 *   get:
 *     tags: [Finance]
 *     summary: List finance accounts
 *     responses:
 *       200: { description: Account list }
 *   post:
 *     tags: [Finance]
 *     summary: Create a finance account
 *     responses:
 *       201: { description: Account created }
 */
router.get('/accounts', c.getAccounts);
router.post('/accounts', authorize('head_pastor', 'pastor'), [
  body('name').notEmpty().trim().escape(),
], handleValidationErrors, c.createAccount);

/**
 * @swagger
 * /finance/categories:
 *   get:
 *     tags: [Finance]
 *     summary: List giving categories
 *     responses:
 *       200: { description: Category list }
 */
router.get('/categories', c.getCategories);
router.post('/categories', authorize('head_pastor', 'pastor', 'hod'), [
  body('name').notEmpty().trim().escape(),
], handleValidationErrors, c.createCategory);

module.exports = router;
