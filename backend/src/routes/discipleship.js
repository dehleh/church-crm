const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const discipleship = require('../controllers/discipleshipController');

router.use(authenticate);

router.get('/courses', authorize('admin', 'pastor', 'director', 'hod'), discipleship.getCourses);
router.get('/courses/:id', authorize('admin', 'pastor', 'director', 'hod'), discipleship.getCourse);
router.post('/courses', authorize('admin', 'pastor', 'director'), discipleship.createCourse);
router.put('/courses/:id', authorize('admin', 'pastor', 'director'), discipleship.updateCourse);
router.delete('/courses/:id', authorize('admin', 'pastor'), discipleship.deleteCourse);

router.post('/courses/:id/lessons', authorize('admin', 'pastor', 'director'), discipleship.createLesson);
router.put('/lessons/:lessonId', authorize('admin', 'pastor', 'director'), discipleship.updateLesson);
router.delete('/lessons/:lessonId', authorize('admin', 'pastor'), discipleship.deleteLesson);

router.post('/courses/:id/enroll', authorize('admin', 'pastor', 'director', 'hod'), discipleship.enrollMemberAdmin);
router.post('/seed-default', authorize('admin'), discipleship.seedDefaultCourses);

module.exports = router;
