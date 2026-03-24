const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getBudgets = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.*, u.first_name||' '||u.last_name as created_by_name,
              br.name as branch_name,
              ROUND((b.spent_amount/NULLIF(b.total_amount,0))*100,1) as spend_pct
       FROM budgets b LEFT JOIN users u ON u.id=b.created_by LEFT JOIN branches br ON br.id=b.branch_id
       WHERE b.church_id=$1 ORDER BY b.start_date DESC`, [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createBudget = async (req, res) => {
  const { name, periodType, startDate, endDate, totalAmount, branchId } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO budgets (id, church_id, branch_id, name, period_type, start_date, end_date, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.churchId, branchId||null, name, periodType||'monthly', startDate, endDate, totalAmount, req.user.id]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateBudget = async (req, res) => {
  const { id } = req.params;
  const { name, totalAmount, status } = req.body;
  try {
    const { rows } = await query(
      `UPDATE budgets SET name=COALESCE($3,name), total_amount=COALESCE($4,total_amount), status=COALESCE($5,status)
       WHERE id=$1 AND church_id=$2 RETURNING *`,
      [id, req.churchId, name, totalAmount, status]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getBudgets, createBudget, updateBudget };
