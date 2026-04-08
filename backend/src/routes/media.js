const express = require('express');
const router = express.Router();
const c = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, uploadFor } = require('../middleware/upload');

router.use(authenticate);
router.get('/stats', c.getMediaStats);
router.get('/', c.getMediaItems);
router.post('/', authorize('head_pastor', 'pastor', 'hod'), c.createMediaItem);
router.post('/upload', authorize('head_pastor', 'pastor', 'hod'), uploadFor('media'), upload.single('file'), c.uploadMediaFile);
router.patch('/:id/publish', authorize('head_pastor', 'pastor'), c.publishMediaItem);

module.exports = router;
