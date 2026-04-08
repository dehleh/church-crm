const express = require('express');
const router = express.Router();
const c = require('../controllers/branchesController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getBranches);
router.get('/:id', c.getBranch);
router.post('/', authorize('head_pastor', 'pastor'), c.createBranch);
router.put('/:id', authorize('head_pastor', 'pastor'), c.updateBranch);

module.exports = router;
