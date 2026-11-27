const express = require('express');
const router = express.Router();
const c = require('../controllers/reportsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Senior Pastor 360° Executive Brief
router.get('/senior-pastor-brief', authorize('admin', 'senior_pastor', 'head_pastor', 'pastor', 'director'), c.getSeniorPastorBrief);

// Executive Infographic Board Reports
router.get('/friendship-unit', authorize('admin', 'pastor', 'director', 'hod'), c.getFriendshipUnitReport);
router.get('/hangout-assimilation', authorize('admin', 'pastor', 'director', 'hod'), c.getHangoutReport);
router.get('/finance-executive', authorize('admin', 'pastor', 'director', 'finance'), c.getFinanceExecutiveReport);
router.get('/budget-performance', authorize('admin', 'pastor', 'director', 'finance'), c.getBudgetPerformanceReport);
router.get('/procurement-audit', authorize('admin', 'pastor', 'director', 'finance', 'hod'), c.getProcurementAuditReport);

// Standard tabular reports
router.get('/members', authorize('admin', 'pastor', 'director'), c.getMemberReport);
router.get('/finance', authorize('admin', 'pastor', 'finance'), c.getFinanceReport);
router.get('/attendance', authorize('admin', 'pastor', 'director', 'hod'), c.getAttendanceReport);
router.get('/first-timers', authorize('admin', 'pastor', 'director'), c.getFirstTimerReport);

module.exports = router;
