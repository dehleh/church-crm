const express = require('express');
const router = express.Router();
const c = require('../controllers/branchesController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getBranches);
router.get('/:id', c.getBranch);
router.post('/', authorize('super_admin', 'admin'), c.createBranch);
router.put('/:id', authorize('super_admin', 'admin'), c.updateBranch);

module.exports = router;
