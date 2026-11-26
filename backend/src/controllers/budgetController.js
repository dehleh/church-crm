const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');

// Helper to calculate total from line items if provided
function calculateItemsTotal(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((acc, item) => {
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const unit = Number(item.unitCost) >= 0 ? Number(item.unitCost) : 0;
    const itemTotal = Number(item.totalAmount) > 0 ? Number(item.totalAmount) : (qty * unit);
    return acc + itemTotal;
  }, 0);
}

// GET /api/budgets
const getBudgets = async (req, res) => {
  const { departmentId, periodType, fiscalYear, status, search } = req.query;
  try {
    let conditions = ['b.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    // HOD access filter: can see approved/active churchwide budgets OR their own department's proposals
    if (req.user?.role === 'hod' && req.user?.department_id) {
      conditions.push(`(
        b.status IN ('active', 'approved')
        OR b.department_id = $${idx}
        OR b.created_by = $${idx + 1}
      )`);
      params.push(req.user.department_id, req.user.id);
      idx += 2;
    }

    if (departmentId) {
      if (departmentId === 'churchwide' || departmentId === 'null') {
        conditions.push('b.department_id IS NULL');
      } else {
        conditions.push(`b.department_id = $${idx++}`);
        params.push(departmentId);
      }
    }

    if (periodType) {
      conditions.push(`b.period_type = $${idx++}`);
      params.push(periodType);
    }

    if (fiscalYear) {
      conditions.push(`b.fiscal_year = $${idx++}`);
      params.push(parseInt(fiscalYear));
    }

    if (status) {
      conditions.push(`b.status = $${idx++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(b.name ILIKE $${idx} OR d.name ILIKE $${idx} OR b.notes ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    idx = applyBranchFilter(req, 'b.branch_id', conditions, params, idx, { allowNullBranch: true });

    const sql = `
      SELECT b.*,
             d.name as department_name,
             u.first_name || ' ' || u.last_name as created_by_name,
             sub.first_name || ' ' || sub.last_name as submitted_by_name,
             appr.first_name || ' ' || appr.last_name as approved_by_name,
             br.name as branch_name,
             COALESCE((
               SELECT COUNT(*)::int FROM budget_items bi WHERE bi.budget_id = b.id
             ), 0) as items_count,
             ROUND((b.spent_amount / NULLIF(b.total_amount, 0)) * 100, 1) as spend_pct,
             (b.total_amount - COALESCE(b.spent_amount, 0)) as remaining_amount
      FROM budgets b
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN users u ON u.id = b.created_by
      LEFT JOIN users sub ON sub.id = b.submitted_by
      LEFT JOIN users appr ON appr.id = b.approved_by
      LEFT JOIN branches br ON br.id = b.branch_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.start_date DESC, b.created_at DESC
    `;

    const { rows } = await query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getBudgets error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/budgets/:id
const getBudgetById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: budgetRows } = await query(
      `SELECT b.*,
              d.name as department_name,
              u.first_name || ' ' || u.last_name as created_by_name,
              sub.first_name || ' ' || sub.last_name as submitted_by_name,
              appr.first_name || ' ' || appr.last_name as approved_by_name,
              br.name as branch_name,
              ROUND((b.spent_amount / NULLIF(b.total_amount, 0)) * 100, 1) as spend_pct,
              (b.total_amount - COALESCE(b.spent_amount, 0)) as remaining_amount
       FROM budgets b
       LEFT JOIN departments d ON d.id = b.department_id
       LEFT JOIN users u ON u.id = b.created_by
       LEFT JOIN users sub ON sub.id = b.submitted_by
       LEFT JOIN users appr ON appr.id = b.approved_by
       LEFT JOIN branches br ON br.id = b.branch_id
       WHERE b.id = $1 AND b.church_id = $2`,
      [id, req.churchId]
    );

    if (!budgetRows[0]) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const { rows: items } = await query(
      `SELECT * FROM budget_items
       WHERE budget_id = $1 AND church_id = $2
       ORDER BY created_at ASC`,
      [id, req.churchId]
    );

    return res.json({
      success: true,
      data: {
        ...budgetRows[0],
        items
      }
    });
  } catch (err) {
    logger.error('getBudgetById error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/budgets
const createBudget = async (req, res) => {
  const {
    name,
    departmentId,
    periodType = 'annual',
    periodDetail,
    fiscalYear,
    startDate,
    endDate,
    totalAmount,
    notes,
    branchId,
    status = 'draft',
    items = []
  } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Budget name, start date, and end date are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const finalBranchId = resolveWriteBranchId(req, branchId);
    let finalDeptId = departmentId || null;
    if (req.user?.role === 'hod' && req.user?.department_id) {
      finalDeptId = req.user.department_id;
    }

    // Determine status: HODs submit or save as draft; Admins/Finance can directly activate or approve
    let finalStatus = status;
    let submittedAt = null;
    let submittedBy = null;
    let approvedAt = null;
    let approvedBy = null;

    if (status === 'submitted') {
      submittedAt = new Date();
      submittedBy = req.user.id;
    } else if (status === 'approved' || status === 'active') {
      if (['admin', 'pastor', 'finance'].includes(req.user.role)) {
        approvedAt = new Date();
        approvedBy = req.user.id;
        finalStatus = 'approved';
      } else {
        finalStatus = 'submitted';
        submittedAt = new Date();
        submittedBy = req.user.id;
      }
    } else {
      finalStatus = 'draft';
    }

    // Compute total amount from items if items provided
    const itemsTotal = calculateItemsTotal(items);
    const finalTotal = itemsTotal > 0 ? itemsTotal : (Number(totalAmount) || 0);

    const budgetId = uuidv4();
    const curYear = fiscalYear ? parseInt(fiscalYear) : new Date(startDate).getFullYear();

    const insertBudgetSql = `
      INSERT INTO budgets (
        id, church_id, branch_id, department_id, name,
        period_type, period_detail, fiscal_year, start_date, end_date,
        total_amount, status, notes, items_count,
        submitted_at, submitted_by, approved_at, approved_by,
        created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `;

    const budgetValues = [
      budgetId,
      req.churchId,
      finalBranchId,
      finalDeptId,
      name.trim(),
      periodType,
      periodDetail || null,
      curYear,
      startDate,
      endDate,
      finalTotal,
      finalStatus,
      notes || null,
      Array.isArray(items) ? items.length : 0,
      submittedAt,
      submittedBy,
      approvedAt,
      approvedBy,
      req.user.id
    ];

    const { rows: budgetRows } = await client.query(insertBudgetSql, budgetValues);
    const createdBudget = budgetRows[0];

    // Batch insert line items
    let insertedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.itemName) continue;
        const itemId = uuidv4();
        const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const unit = Number(item.unitCost) >= 0 ? Number(item.unitCost) : 0;
        const lineTotal = Number(item.totalAmount) > 0 ? Number(item.totalAmount) : (qty * unit);

        const { rows: itemRows } = await client.query(
          `INSERT INTO budget_items (
            id, church_id, budget_id, item_name, category, description,
            quantity, unit_cost, total_amount, priority
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *`,
          [
            itemId,
            req.churchId,
            budgetId,
            item.itemName.trim(),
            item.category || 'operational',
            item.description || null,
            qty,
            unit,
            lineTotal,
            item.priority || 'medium'
          ]
        );
        insertedItems.push(itemRows[0]);
      }
    }

    await client.query('COMMIT');

    logger.info('Budget created successfully', {
      budgetId,
      name,
      departmentId: finalDeptId,
      totalAmount: finalTotal,
      status: finalStatus,
      itemsCount: insertedItems.length
    });

    return res.status(201).json({
      success: true,
      data: {
        ...createdBudget,
        items: insertedItems
      },
      message: finalStatus === 'submitted'
        ? 'Department budget submitted for leadership approval!'
        : 'Budget created successfully'
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('createBudget error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  } finally {
    client.release();
  }
};

// PUT /api/budgets/:id
const updateBudget = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    departmentId,
    periodType,
    periodDetail,
    fiscalYear,
    startDate,
    endDate,
    totalAmount,
    notes,
    status,
    items
  } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify existing budget
    const { rows: existingRows } = await client.query(
      'SELECT * FROM budgets WHERE id = $1 AND church_id = $2 FOR UPDATE',
      [id, req.churchId]
    );

    if (!existingRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const current = existingRows[0];

    // HOD validation: HOD cannot modify budget once approved without leadership
    if (req.user?.role === 'hod' && current.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Approved budgets can only be modified by church finance or pastors.' });
    }

    // Handle line items if provided
    let finalTotal = current.total_amount;
    let itemsCount = current.items_count;
    let updatedItems = [];

    if (Array.isArray(items)) {
      await client.query('DELETE FROM budget_items WHERE budget_id = $1 AND church_id = $2', [id, req.churchId]);
      const itemsTotal = calculateItemsTotal(items);
      finalTotal = itemsTotal > 0 ? itemsTotal : (totalAmount !== undefined ? Number(totalAmount) : current.total_amount);
      itemsCount = items.length;

      for (const item of items) {
        if (!item.itemName) continue;
        const itemId = uuidv4();
        const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const unit = Number(item.unitCost) >= 0 ? Number(item.unitCost) : 0;
        const lineTotal = Number(item.totalAmount) > 0 ? Number(item.totalAmount) : (qty * unit);

        const { rows: itemRows } = await client.query(
          `INSERT INTO budget_items (
            id, church_id, budget_id, item_name, category, description,
            quantity, unit_cost, total_amount, priority
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *`,
          [
            itemId,
            req.churchId,
            id,
            item.itemName.trim(),
            item.category || 'operational',
            item.description || null,
            qty,
            unit,
            lineTotal,
            item.priority || 'medium'
          ]
        );
        updatedItems.push(itemRows[0]);
      }
    } else if (totalAmount !== undefined) {
      finalTotal = Number(totalAmount);
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE budgets
       SET name = COALESCE($1, name),
           department_id = COALESCE($2, department_id),
           period_type = COALESCE($3, period_type),
           period_detail = COALESCE($4, period_detail),
           fiscal_year = COALESCE($5, fiscal_year),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date),
           total_amount = $8,
           status = COALESCE($9, status),
           notes = COALESCE($10, notes),
           items_count = $11,
           updated_at = NOW()
       WHERE id = $12 AND church_id = $13
       RETURNING *`,
      [
        name ? name.trim() : null,
        departmentId !== undefined ? (departmentId || null) : current.department_id,
        periodType || null,
        periodDetail || null,
        fiscalYear ? parseInt(fiscalYear) : null,
        startDate || null,
        endDate || null,
        finalTotal,
        status || null,
        notes !== undefined ? notes : current.notes,
        itemsCount,
        id,
        req.churchId
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        ...updatedRows[0],
        items: updatedItems
      },
      message: 'Budget updated successfully'
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('updateBudget error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// POST /api/budgets/:id/submit (Draft or Rejected -> Submitted)
const submitBudget = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `UPDATE budgets
       SET status = 'submitted',
           submitted_at = NOW(),
           submitted_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND church_id = $3
       RETURNING *`,
      [req.user.id, id, req.churchId]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });

    logger.info('Department budget submitted for review', { budgetId: id, user: req.user.id });
    return res.json({
      success: true,
      data: rows[0],
      message: 'Budget submitted for leadership & finance approval'
    });
  } catch (err) {
    logger.error('submitBudget error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/budgets/:id/approve (Submitted -> Approved)
const approveBudget = async (req, res) => {
  const { id } = req.params;
  const { reviewNotes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE budgets
       SET status = 'approved',
           approved_at = NOW(),
           approved_by = $1,
           review_notes = $2,
           rejection_reason = NULL,
           updated_at = NOW()
       WHERE id = $3 AND church_id = $4
       RETURNING *`,
      [req.user.id, reviewNotes || null, id, req.churchId]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });

    logger.info('Department budget approved', { budgetId: id, approver: req.user.id });
    return res.json({
      success: true,
      data: rows[0],
      message: 'Department budget approved and incorporated into church general budget plan'
    });
  } catch (err) {
    logger.error('approveBudget error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/budgets/:id/reject (Submitted -> Rejected)
const rejectBudget = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a reason or revision note for rejection.' });
  }

  try {
    const { rows } = await query(
      `UPDATE budgets
       SET status = 'rejected',
           rejection_reason = $1,
           updated_at = NOW()
       WHERE id = $2 AND church_id = $3
       RETURNING *`,
      [reason.trim(), id, req.churchId]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });

    logger.info('Department budget rejected with feedback', { budgetId: id, reason });
    return res.json({
      success: true,
      data: rows[0],
      message: 'Budget returned with revision feedback'
    });
  } catch (err) {
    logger.error('rejectBudget error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await query('SELECT * FROM budgets WHERE id = $1 AND church_id = $2', [id, req.churchId]);
    if (!checkRes.rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });

    const budget = checkRes.rows[0];
    if (req.user?.role === 'hod' && budget.status === 'approved') {
      return res.status(403).json({ success: false, message: 'Approved budgets can only be deleted by church admin or pastors.' });
    }

    await query('DELETE FROM budgets WHERE id = $1 AND church_id = $2', [id, req.churchId]);
    return res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (err) {
    logger.error('deleteBudget error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/budgets/summary/overview
const getBudgetSummary = async (req, res) => {
  const { fiscalYear } = req.query;
  const curYear = fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear();

  try {
    const { rows: stats } = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN b.department_id IS NULL AND b.status IN ('approved', 'active') THEN b.total_amount ELSE 0 END), 0) as churchwide_total,
         COALESCE(SUM(CASE WHEN b.department_id IS NOT NULL AND b.status IN ('approved', 'active') THEN b.total_amount ELSE 0 END), 0) as department_approved_total,
         COALESCE(SUM(CASE WHEN b.status IN ('approved', 'active') THEN b.total_amount ELSE 0 END), 0) as grand_planned_total,
         COALESCE(SUM(CASE WHEN b.status IN ('approved', 'active') THEN b.spent_amount ELSE 0 END), 0) as total_spent,
         COUNT(*) FILTER (WHERE b.status = 'submitted') as pending_proposals_count,
         COALESCE(SUM(CASE WHEN b.status = 'submitted' THEN b.total_amount ELSE 0 END), 0) as pending_proposals_amount
       FROM budgets b
       WHERE b.church_id = $1 AND (b.fiscal_year = $2 OR EXTRACT(YEAR FROM b.start_date) = $2)`,
      [req.churchId, curYear]
    );

    // Department breakdown
    const { rows: departmentBreakdown } = await query(
      `SELECT
         d.id as department_id,
         d.name as department_name,
         COALESCE(SUM(CASE WHEN b.status IN ('approved', 'active') THEN b.total_amount ELSE 0 END), 0) as approved_budget,
         COALESCE(SUM(CASE WHEN b.status IN ('approved', 'active') THEN b.spent_amount ELSE 0 END), 0) as spent_amount,
         COALESCE(SUM(CASE WHEN b.status = 'submitted' THEN b.total_amount ELSE 0 END), 0) as submitted_pending_amount,
         COUNT(b.id) as budgets_count
       FROM departments d
       LEFT JOIN budgets b ON b.department_id = d.id AND (b.fiscal_year = $2 OR EXTRACT(YEAR FROM b.start_date) = $2)
       WHERE d.church_id = $1
       GROUP BY d.id, d.name
       ORDER BY approved_budget DESC, d.name ASC`,
      [req.churchId, curYear]
    );

    const s = stats[0] || {};
    const planned = Number(s.grand_planned_total || 0);
    const spent = Number(s.total_spent || 0);
    const variance = planned - spent;
    const utilizationRate = planned > 0 ? Math.round((spent / planned) * 100) : 0;

    return res.json({
      success: true,
      data: {
        fiscalYear: curYear,
        churchwideTotal: Number(s.churchwide_total || 0),
        departmentApprovedTotal: Number(s.department_approved_total || 0),
        grandPlannedTotal: planned,
        totalSpent: spent,
        remainingBalance: variance,
        utilizationRate,
        pendingProposalsCount: parseInt(s.pending_proposals_count || 0),
        pendingProposalsAmount: Number(s.pending_proposals_amount || 0),
        departmentBreakdown
      }
    });
  } catch (err) {
    logger.error('getBudgetSummary error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  submitBudget,
  approveBudget,
  rejectBudget,
  deleteBudget,
  getBudgetSummary
};
