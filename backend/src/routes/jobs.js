const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getJobStatus } = require('../controllers/jobsController');

router.use(authenticate);
router.get('/:id', getJobStatus);

module.exports = router;
