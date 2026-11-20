const { query } = require('../config/database');
const logger = require('../config/logger');

const getDashboard = async (req, res) => {
  const churchId = req.churchId;
  const branchId = req.branchId || null;
  const baseParams = branchId ? [churchId, branchId] : [churchId];
  const branchCond = branchId ? ' AND branch_id = $2' : '';
  const eventBranchCond = branchId ? ' AND e.branch_id = $2' : '';

  try {
    const [members, firstTimers, events, finance, recentActivity, attendance, readinessRows] = await Promise.all([
      // Member stats
      query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE membership_status = 'active') as active,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month,
          COUNT(*) FILTER (WHERE gender = 'male') as male,
          COUNT(*) FILTER (WHERE gender = 'female') as female
         FROM members WHERE church_id = $1${branchCond}`,
        baseParams
      ),
      // First timer stats
      query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE follow_up_status = 'pending') as pending_follow_up,
          COUNT(*) FILTER (WHERE visit_date >= NOW() - INTERVAL '30 days') as this_month,
          COUNT(*) FILTER (WHERE converted_to_member = true) as converted
         FROM first_timers WHERE church_id = $1${branchCond}`,
        baseParams
      ),
      // Events stats
      query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
          COUNT(*) FILTER (WHERE start_datetime >= DATE_TRUNC('month', NOW())) as this_month,
          AVG(actual_attendance) FILTER (WHERE actual_attendance > 0) as avg_attendance
         FROM events WHERE church_id = $1${branchCond}`,
        baseParams
      ),
      // Finance summary for current month
      query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0) as total_income,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0) as total_expense,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income' AND transaction_date >= DATE_TRUNC('month', NOW())), 0) as month_income,
          COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense' AND transaction_date >= DATE_TRUNC('month', NOW())), 0) as month_expense
         FROM transactions WHERE church_id = $1 AND status = 'completed'${branchCond}`,
        baseParams
      ),
      // Recent activity (last 10 events across key tables)
      query(
        `(SELECT 'new_member' as type, first_name || ' ' || last_name as title, created_at FROM members WHERE church_id = $1${branchCond} ORDER BY created_at DESC LIMIT 3)
         UNION ALL
         (SELECT 'first_timer' as type, first_name || ' ' || last_name as title, created_at FROM first_timers WHERE church_id = $1${branchCond} ORDER BY created_at DESC LIMIT 3)
         UNION ALL
         (SELECT 'transaction' as type, description as title, created_at FROM transactions WHERE church_id = $1${branchCond} ORDER BY created_at DESC LIMIT 3)
         ORDER BY created_at DESC LIMIT 10`,
        baseParams
      ),
      // Attendance trend — last 8 events
      query(
        `SELECT e.title, e.start_datetime, e.actual_attendance, e.event_type
         FROM events e
         WHERE e.church_id = $1 AND e.status = 'completed' AND e.actual_attendance IS NOT NULL${eventBranchCond}
         ORDER BY e.start_datetime DESC LIMIT 8`,
        baseParams
      ),
      // Upcoming Pre-Service Readiness Checklists
      query(
        `SELECT cl.id, cl.service_title, cl.service_date, cl.service_time, cl.status,
                d.name as department_name, d.category as department_category,
                COUNT(ci.id)::int as total_items,
                COUNT(ci.id) FILTER (WHERE ci.is_completed = true)::int as completed_items
         FROM department_service_checklists cl
         JOIN departments d ON d.id = cl.department_id
         LEFT JOIN department_checklist_items ci ON ci.checklist_id = cl.id
         WHERE cl.church_id = $1 AND cl.service_date >= CURRENT_DATE - INTERVAL '1 day'
         GROUP BY cl.id, d.name, d.category
         ORDER BY cl.service_date ASC, d.name ASC
         LIMIT 6`,
        [churchId]
      ).catch(() => ({ rows: [] }))
    ]);

    const userRole = req.user?.role;
    const canViewFinance = Boolean(
      req.user?.is_super_admin ||
      ['head_pastor', 'admin', 'church_admin', 'pastor', 'branch_pastor', 'finance', 'accountant'].includes(userRole)
    );

    const filteredActivity = canViewFinance
      ? recentActivity.rows
      : recentActivity.rows.filter(a => a.type !== 'transaction');

    // Calculate overall service readiness metric if any checklists exist
    const checklists = readinessRows.rows || [];
    let serviceReadiness = null;
    if (checklists.length > 0) {
      const first = checklists[0];
      const sameServiceLists = checklists.filter(c => c.service_title === first.service_title && String(c.service_date) === String(first.service_date));
      const totalTasks = sameServiceLists.reduce((sum, c) => sum + (c.total_items || 0), 0);
      const completedTasks = sameServiceLists.reduce((sum, c) => sum + (c.completed_items || 0), 0);
      serviceReadiness = {
        serviceTitle: first.service_title,
        serviceDate: first.service_date,
        serviceTime: first.service_time,
        totalTasks,
        completedTasks,
        progressPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        departments: sameServiceLists.map(c => ({
          id: c.id,
          name: c.department_name,
          category: c.department_category,
          status: c.status,
          total: c.total_items || 0,
          completed: c.completed_items || 0,
          pct: c.total_items > 0 ? Math.round(((c.completed_items || 0) / c.total_items) * 100) : 0,
        }))
      };
    }

    return res.json({
      success: true,
      data: {
        members: members.rows[0],
        firstTimers: firstTimers.rows[0],
        events: events.rows[0],
        finance: canViewFinance ? finance.rows[0] : null,
        recentActivity: filteredActivity,
        attendanceTrend: attendance.rows,
        serviceReadiness,
      }
    });
  } catch (err) {
    logger.error('Dashboard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard };
