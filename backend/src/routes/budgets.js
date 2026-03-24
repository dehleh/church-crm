const express = require('express');
const router = express.Router();
const c = require('../controllers/budgetController');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.get('/', c.getBudgets);
router.post('/', authorize('super_admin','admin'), c.createBudget);
router.put('/:id', authorize('super_admin','admin'), c.updateBudget);
module.exports = router;
