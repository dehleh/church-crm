const express = require('express');
const router = express.Router();
const c = require('../controllers/budgetController');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.get('/', c.getBudgets);
router.post('/', authorize('head_pastor','pastor'), c.createBudget);
router.put('/:id', authorize('head_pastor','pastor'), c.updateBudget);
module.exports = router;
