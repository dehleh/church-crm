const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const discipleship = require('../controllers/discipleshipController');

router.use(authenticate);


router.get('/courses', discipleship.getCourses);
router.get('/courses/:id', discipleship.getCourse);
router.post('/courses', discipleship.createCourse);
router.put('/courses/:id', discipleship.updateCourse);
router.delete('/courses/:id', discipleship.deleteCourse);

router.post('/courses/:id/lessons', discipleship.createLesson);
router.put('/lessons/:lessonId', discipleship.updateLesson);
router.delete('/lessons/:lessonId', discipleship.deleteLesson);

router.post('/courses/:id/enroll', discipleship.enrollMemberAdmin);
router.post('/seed-default', discipleship.seedDefaultCourses);

module.exports = router;
