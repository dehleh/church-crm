const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');

const getBudgets = async (req, res) => {
  try {
    let conditions = ['b.church_id=$1'];
    let params = [req.churchId];
    applyBranchFilter(req, 'b.branch_id', conditions, params, 2, { allowNullBranch: true });

    const { rows } = await query(
      `SELECT b.*, u.first_name||' '||u.last_name as created_by_name,
              br.name as branch_name,
              ROUND((b.spent_amount/NULLIF(b.total_amount,0))*100,1) as spend_pct
       FROM budgets b LEFT JOIN users u ON u.id=b.created_by LEFT JOIN branches br ON br.id=b.branch_id
       WHERE ${conditions.join(' AND ')} ORDER BY b.start_date DESC`, params
    );
    return res.json({ success: true, data: rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createBudget = async (req, res) => {
  const { name, periodType, startDate, endDate, totalAmount, branchId } = req.body;
  try {
    const finalBranchId = resolveWriteBranchId(req, branchId);
    const { rows } = await query(
      `INSERT INTO budgets (id, church_id, branch_id, name, period_type, start_date, end_date, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.churchId, finalBranchId, name, periodType||'monthly', startDate, endDate, totalAmount, req.user.id]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateBudget = async (req, res) => {
  const { id } = req.params;
  const { name, totalAmount, status } = req.body;
  try {
    let conditions = ['id=$1', 'church_id=$2'];
    let params = [id, req.churchId, name, totalAmount, status];
    applyBranchFilter(req, 'branch_id', conditions, params, 6);

    const { rows } = await query(
      `UPDATE budgets SET name=COALESCE($3,name), total_amount=COALESCE($4,total_amount), status=COALESCE($5,status), updated_at=NOW()
       WHERE ${conditions.join(' AND ')} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getBudgets, createBudget, updateBudget };
