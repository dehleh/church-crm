const express = require('express');
const router = express.Router();
const c = require('../controllers/branchesController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.use(authenticate);
router.get('/', c.getBranches);
router.get('/:id', c.getBranch);
router.post('/', authorize('head_pastor', 'pastor'), [
  body('name').notEmpty().trim().escape(),
], handleValidationErrors, c.createBranch);
router.put('/:id', authorize('head_pastor', 'pastor'), [
  body('name').optional().trim().escape(),
], handleValidationErrors, c.updateBranch);

module.exports = router;
