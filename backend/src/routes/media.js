const express = require('express');
const router = express.Router();
const c = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, uploadFor } = require('../middleware/upload');

router.use(authenticate);
router.get('/stats', c.getMediaStats);
router.get('/', c.getMediaItems);
router.post('/', authorize('super_admin', 'admin', 'staff'), c.createMediaItem);
router.post('/upload', authorize('super_admin', 'admin', 'staff'), uploadFor('media'), upload.single('file'), c.uploadMediaFile);
router.patch('/:id/publish', authorize('super_admin', 'admin'), c.publishMediaItem);

module.exports = router;
