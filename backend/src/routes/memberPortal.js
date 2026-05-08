const router = require('express').Router();
const { authenticateMember } = require('../middleware/memberAuth');
const c = require('../controllers/memberPortalController');

router.use(authenticateMember);
router.get('/home', c.getHome);
router.get('/profile', c.getProfile);
router.patch('/profile', c.updateProfile);
router.get('/giving', c.getGiving);
router.get('/events', c.getEvents);
router.post('/prayer-requests', c.submitPrayerRequest);

module.exports = router;
