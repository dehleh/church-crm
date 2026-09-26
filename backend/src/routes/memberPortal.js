const router = require('express').Router();
const { authenticateMember } = require('../middleware/memberAuth');
const { upload, uploadFor } = require('../middleware/upload');
const c = require('../controllers/memberPortalController');

router.use(authenticateMember);

router.get('/home', c.getHome);

router.get('/profile', c.getProfile);
router.patch('/profile', c.updateProfile);
router.post('/avatar', uploadFor('avatars'), upload.single('avatar'), c.uploadAvatar);

router.get('/affiliations', c.getAffiliations);

router.get('/giving', c.getGiving);
router.get('/events', c.getEvents);

router.get('/prayer-requests', c.listMyPrayerRequests);
router.post('/prayer-requests', c.submitPrayerRequest);

router.get('/welfare/packages', c.listWelfarePackages);
router.get('/welfare/applications', c.listMyWelfareApplications);
router.post('/welfare/applications', c.submitWelfareRequest);

router.get('/counseling', c.listMyCounselingSessions);
router.post('/counseling', c.submitCounselingRequest);

router.get('/fellowship', c.getMyFellowship);
router.get('/fellowship/browse', c.browseNearbyFellowships);
router.post('/fellowship/join', c.submitFellowshipJoinRequest);
router.post('/fellowship/reports', c.submitMemberCellReport);

// Daily Devotionals
router.get('/devotionals/today', c.getTodayDevotional);
router.get('/devotionals', c.listDevotionals);
router.get('/devotionals/:date', c.getDevotionalByDate);

// Discipleship & Training
router.get('/discipleship/courses', c.listMyDiscipleshipCourses);
router.get('/discipleship/courses/:id', c.getMyDiscipleshipCourseDetails);
router.post('/discipleship/courses/:id/enroll', c.enrollInDiscipleshipCourse);
router.post('/discipleship/lessons/:lessonId/complete', c.completeLessonProgress);

module.exports = router;


