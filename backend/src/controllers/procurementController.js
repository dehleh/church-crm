const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ── REQUISITIONS ────────────────────────────────────────────

const getRequisitions = async (req, res) => {
  const { page = 1, limit = 20, status, month } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['r.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
    if (month) { conditions.push(`r.requisition_month = $${idx++}`); params.push(month); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM requisitions r WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT r.*,
        u.first_name || ' ' || u.last_name as raised_by_name,
        a.first_name || ' ' || a.last_name as approved_by_name,
        d.name as department_name
       FROM requisitions r
       LEFT JOIN users u ON u.id = r.raised_by
       LEFT JOIN users a ON a.id = r.approved_by
       LEFT JOIN departments d ON d.id = r.department_id
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, params
    );
    return res.json({
      success: true, data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) }
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createRequisition = async (req, res) => {
  const { title, description, requisitionMonth, departmentId, items, totalAmount, branchId, notes } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO requisitions (id, church_id, branch_id, title, description, requisition_month, department_id, items, total_amount, raised_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuidv4(), req.churchId, branchId || null, title, description || null, requisitionMonth, departmentId || null, JSON.stringify(items || []), totalAmount || 0, req.user.id, notes || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateRequisition = async (req, res) => {
  const { id } = req.params;
  const { status, items, totalAmount, notes, title, description } = req.body;
  try {
    const updates = [];
    const params = [id, req.churchId];
    let idx = 3;
    if (status) { updates.push(`status = $${idx++}`); params.push(status); }
    if (items) { updates.push(`items = $${idx++}`); params.push(JSON.stringify(items)); }
    if (totalAmount !== undefined) { updates.push(`total_amount = $${idx++}`); params.push(totalAmount); }
    if (notes !== undefined) { updates.push(`notes = $${idx++}`); params.push(notes); }
    if (title) { updates.push(`title = $${idx++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }

    if (status === 'approved') {
      updates.push(`approved_by = $${idx++}`); params.push(req.user.id);
      updates.push(`approved_at = NOW()`);
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    const { rows } = await query(
      `UPDATE requisitions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 AND church_id = $2 RETURNING *`, params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Requisition not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── PURCHASE REQUESTS ───────────────────────────────────────

const getPurchaseRequests = async (req, res) => {
  const { page = 1, limit = 20, status, priority } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['pr.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    if (status) { conditions.push(`pr.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`pr.priority = $${idx++}`); params.push(priority); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM purchase_requests pr WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT pr.*,
        u.first_name || ' ' || u.last_name as raised_by_name,
        rv.first_name || ' ' || rv.last_name as reviewed_by_name,
        req.title as requisition_title
       FROM purchase_requests pr
       LEFT JOIN users u ON u.id = pr.raised_by
       LEFT JOIN users rv ON rv.id = pr.reviewed_by
       LEFT JOIN requisitions req ON req.id = pr.requisition_id
       WHERE ${where}
       ORDER BY
         CASE pr.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
         pr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, params
    );
    return res.json({
      success: true, data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) }
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createPurchaseRequest = async (req, res) => {
  const { title, description, vendorName, items, totalAmount, priority, requisitionId, branchId } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO purchase_requests (id, church_id, branch_id, requisition_id, title, description, vendor_name, items, total_amount, priority, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuidv4(), req.churchId, branchId || null, requisitionId || null, title, description || null, vendorName || null, JSON.stringify(items || []), totalAmount || 0, priority || 'normal', req.user.id]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const reviewPurchaseRequest = async (req, res) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE purchase_requests SET
        status = COALESCE($3, status),
        review_notes = COALESCE($4, review_notes),
        reviewed_by = $5,
        reviewed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, status, reviewNotes, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Purchase request not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getProcurementStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        (SELECT COUNT(*) FROM requisitions WHERE church_id = $1) as total_requisitions,
        (SELECT COUNT(*) FROM requisitions WHERE church_id = $1 AND status = 'submitted') as pending_requisitions,
        (SELECT COUNT(*) FROM purchase_requests WHERE church_id = $1) as total_purchase_requests,
        (SELECT COUNT(*) FROM purchase_requests WHERE church_id = $1 AND status = 'pending') as pending_tickets,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_requests WHERE church_id = $1 AND status = 'approved') as approved_amount
      `, [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getRequisitions, createRequisition, updateRequisition, getPurchaseRequests, createPurchaseRequest, reviewPurchaseRequest, getProcurementStats };
