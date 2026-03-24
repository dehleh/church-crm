const { query } = require('../config/database');

const getMemberReport = async (req, res) => {
  const { branchId, status, startDate, endDate } = req.query;
  try {
    let conditions = ['m.church_id=$1'];
    let params = [req.churchId];
    let idx = 2;
    if (branchId) { conditions.push(`m.branch_id=$${idx++}`); params.push(branchId); }
    if (status)   { conditions.push(`m.membership_status=$${idx++}`); params.push(status); }
    if (startDate){ conditions.push(`m.created_at>=$${idx++}`); params.push(startDate); }
    if (endDate)  { conditions.push(`m.created_at<=$${idx++}`); params.push(endDate); }
    const where = conditions.join(' AND ');
    const { rows } = await query(
      `SELECT m.member_number, m.first_name, m.last_name, m.email, m.phone, m.gender,
              m.date_of_birth, m.membership_status, m.membership_class, m.join_date,
              m.water_baptized, m.holy_ghost_baptized, m.occupation, m.address, m.city,
              b.name as branch_name,
              COALESCE(json_agg(DISTINCT d.name) FILTER (WHERE d.id IS NOT NULL),'[]') as departments
       FROM members m
       LEFT JOIN branches b ON b.id=m.branch_id
       LEFT JOIN member_departments md ON md.member_id=m.id AND md.is_active=true
       LEFT JOIN departments d ON d.id=md.department_id
       WHERE ${where} GROUP BY m.id, b.name ORDER BY m.last_name, m.first_name`,
      params
    );
    return res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getFinanceReport = async (req, res) => {
  const { startDate, endDate, type, categoryId, branchId } = req.query;
  try {
    let conditions = ['t.church_id=$1'];
    let params = [req.churchId];
    let idx = 2;
    if (startDate)  { conditions.push(`t.transaction_date>=$${idx++}`); params.push(startDate); }
    if (endDate)    { conditions.push(`t.transaction_date<=$${idx++}`); params.push(endDate); }
    if (type)       { conditions.push(`t.transaction_type=$${idx++}`); params.push(type); }
    if (categoryId) { conditions.push(`t.category_id=$${idx++}`); params.push(categoryId); }
    if (branchId)   { conditions.push(`t.branch_id=$${idx++}`); params.push(branchId); }
    const where = conditions.join(' AND ');
    const [txRows, summaryRows, catRows] = await Promise.all([
      query(`SELECT t.*, gc.name as category_name, m.first_name||' '||m.last_name as member_name,
             fa.name as account_name
             FROM transactions t
             LEFT JOIN giving_categories gc ON gc.id=t.category_id
             LEFT JOIN members m ON m.id=t.member_id
             LEFT JOIN finance_accounts fa ON fa.id=t.account_id
             WHERE ${where} ORDER BY t.transaction_date DESC`, params),
      query(`SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type='income'),0) as total_income,
             COALESCE(SUM(amount) FILTER (WHERE transaction_type='expense'),0) as total_expense,
             COUNT(*) as total_transactions
             FROM transactions t WHERE ${where}`, params),
      query(`SELECT gc.name, SUM(t.amount) as total, COUNT(*) as count
             FROM transactions t JOIN giving_categories gc ON gc.id=t.category_id
             WHERE ${where} AND t.transaction_type='income'
             GROUP BY gc.name ORDER BY total DESC`, params),
    ]);
    return res.json({
      success: true,
      data: txRows.rows,
      summary: summaryRows.rows[0],
      byCategory: catRows.rows,
      total: txRows.rows.length
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getAttendanceReport = async (req, res) => {
  const { startDate, endDate, branchId, eventType } = req.query;
  try {
    let conditions = ['e.church_id=$1'];
    let params = [req.churchId];
    let idx = 2;
    if (startDate) { conditions.push(`e.start_datetime>=$${idx++}`); params.push(startDate); }
    if (endDate)   { conditions.push(`e.start_datetime<=$${idx++}`); params.push(endDate); }
    if (branchId)  { conditions.push(`e.branch_id=$${idx++}`); params.push(branchId); }
    if (eventType) { conditions.push(`e.event_type=$${idx++}`); params.push(eventType); }
    const where = conditions.join(' AND ');
    const { rows } = await query(
      `SELECT e.title, e.event_type, e.start_datetime, e.expected_attendance, e.actual_attendance,
              b.name as branch_name,
              ROUND(CASE WHEN e.expected_attendance>0 THEN (e.actual_attendance::numeric/e.expected_attendance)*100 ELSE 0 END,1) as fill_rate
       FROM events e LEFT JOIN branches b ON b.id=e.branch_id
       WHERE ${where} AND e.status='completed'
       ORDER BY e.start_datetime DESC`, params
    );
    const totalAttendance = rows.reduce((s, r) => s + (parseInt(r.actual_attendance)||0), 0);
    const avgAttendance = rows.length > 0 ? Math.round(totalAttendance / rows.length) : 0;
    return res.json({ success: true, data: rows, summary: { totalEvents: rows.length, totalAttendance, avgAttendance } });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getFirstTimerReport = async (req, res) => {
  const { startDate, endDate, status } = req.query;
  try {
    let conditions = ['ft.church_id=$1'];
    let params = [req.churchId];
    let idx = 2;
    if (startDate) { conditions.push(`ft.visit_date>=$${idx++}`); params.push(startDate); }
    if (endDate)   { conditions.push(`ft.visit_date<=$${idx++}`); params.push(endDate); }
    if (status)    { conditions.push(`ft.follow_up_status=$${idx++}`); params.push(status); }
    const where = conditions.join(' AND ');
    const [rows, summaryRows] = await Promise.all([
      query(`SELECT ft.*, b.name as branch_name, u.first_name||' '||u.last_name as assigned_to_name
             FROM first_timers ft
             LEFT JOIN branches b ON b.id=ft.branch_id
             LEFT JOIN users u ON u.id=ft.follow_up_assigned_to
             WHERE ${where} ORDER BY ft.visit_date DESC`, params),
      query(`SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE follow_up_status='converted') as converted,
             COUNT(*) FILTER (WHERE follow_up_status='pending') as pending
             FROM first_timers ft WHERE ${where}`, params),
    ]);
    return res.json({ success: true, data: rows.rows, summary: summaryRows.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getMemberReport, getFinanceReport, getAttendanceReport, getFirstTimerReport };
