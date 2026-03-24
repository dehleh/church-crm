const { query } = require('../config/database');
const logger = require('../config/logger');

const getDashboard = async (req, res) => {
  const churchId = req.churchId;

  try {
    const [members, firstTimers, events, finance, recentActivity, attendance] = await Promise.all([
      // Member stats
      query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE membership_status = 'active') as active,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month,
          COUNT(*) FILTER (WHERE gender = 'male') as male,
          COUNT(*) FILTER (WHERE gender = 'female') as female
         FROM members WHERE church_id = $1`,
        [churchId]
      ),
      // First timer stats
      query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE follow_up_status = 'pending') as pending_follow_up,
          COUNT(*) FILTER (WHERE visit_date >= NOW() - INTERVAL '30 days') as this_month,
          COUNT(*) FILTER (WHERE converted_to_member = true) as converted
         FROM first_timers WHERE church_id = $1`,
        [churchId]
      ),
      // Events stats
      query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
          COUNT(*) FILTER (WHERE start_datetime >= DATE_TRUNC('month', NOW())) as this_month,
          AVG(actual_attendance) FILTER (WHERE actual_attendance > 0) as avg_attendance
         FROM events WHERE church_id = $1`,
        [churchId]
      ),
      // Finance summary for current month
      query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0) as total_income,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0) as total_expense,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income' AND transaction_date >= DATE_TRUNC('month', NOW())), 0) as month_income,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense' AND transaction_date >= DATE_TRUNC('month', NOW())), 0) as month_expense
         FROM transactions WHERE church_id = $1 AND status = 'completed'`,
        [churchId]
      ),
      // Recent activity (last 10 events across key tables)
      query(
        `(SELECT 'new_member' as type, first_name || ' ' || last_name as title, created_at FROM members WHERE church_id = $1 ORDER BY created_at DESC LIMIT 3)
         UNION ALL
         (SELECT 'first_timer' as type, first_name || ' ' || last_name as title, created_at FROM first_timers WHERE church_id = $1 ORDER BY created_at DESC LIMIT 3)
         UNION ALL
         (SELECT 'transaction' as type, description as title, created_at FROM transactions WHERE church_id = $1 ORDER BY created_at DESC LIMIT 3)
         ORDER BY created_at DESC LIMIT 10`,
        [churchId]
      ),
      // Attendance trend — last 8 events
      query(
        `SELECT e.title, e.start_datetime, e.actual_attendance, e.event_type
         FROM events e
         WHERE e.church_id = $1 AND e.status = 'completed' AND e.actual_attendance IS NOT NULL
         ORDER BY e.start_datetime DESC LIMIT 8`,
        [churchId]
      )
    ]);

    return res.json({
      success: true,
      data: {
        members: members.rows[0],
        firstTimers: firstTimers.rows[0],
        events: events.rows[0],
        finance: finance.rows[0],
        recentActivity: recentActivity.rows,
        attendanceTrend: attendance.rows
      }
    });
  } catch (err) {
    logger.error('Dashboard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard };
