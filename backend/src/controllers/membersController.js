const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { createMemberRecord } = require('../services/intakeService');

// GET /api/members
const getMembers = async (req, res) => {
  const { page = 1, limit = 20, search, status, branchId, departmentId } = req.query;
  const offset = (page - 1) * limit;
  const churchId = req.churchId;

  try {
    let conditions = ['m.church_id = $1'];
    let params = [churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(m.first_name ILIKE $${idx} OR m.last_name ILIKE $${idx} OR m.email ILIKE $${idx} OR m.phone ILIKE $${idx} OR m.member_number ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (status) { conditions.push(`m.membership_status = $${idx}`); params.push(status); idx++; }
    if (branchId) { conditions.push(`m.branch_id = $${idx}`); params.push(branchId); idx++; }
    if (departmentId) {
      conditions.push(`EXISTS (SELECT 1 FROM member_departments md WHERE md.member_id = m.id AND md.department_id = $${idx} AND md.is_active = true)`);
      params.push(departmentId); idx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) FROM members m WHERE ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT m.*, b.name as branch_name,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') as departments
       FROM members m
       LEFT JOIN branches b ON b.id = m.branch_id
       LEFT JOIN member_departments md ON md.member_id = m.id AND md.is_active = true
       LEFT JOIN departments d ON d.id = md.department_id
       WHERE ${where}
       GROUP BY m.id, b.name
       ORDER BY m.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/members/:id
const getMember = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT m.*, b.name as branch_name,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name, 'role', md.role)) FILTER (WHERE d.id IS NOT NULL), '[]') as departments
       FROM members m
       LEFT JOIN branches b ON b.id = m.branch_id
       LEFT JOIN member_departments md ON md.member_id = m.id AND md.is_active = true
       LEFT JOIN departments d ON d.id = md.department_id
       WHERE m.id = $1 AND m.church_id = $2
       GROUP BY m.id, b.name`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/members
const createMember = async (req, res) => {
  try {
    const record = await createMemberRecord({ churchId: req.churchId, data: req.body });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error' });
  }
};

// PUT /api/members/:id
const updateMember = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const fields = Object.keys(updates);
    const snakeFields = fields.map(f => f.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`));
    const setClause = snakeFields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const { rows } = await query(
      `UPDATE members SET ${setClause} WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, ...values]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/members/:id (soft delete)
const deleteMember = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `UPDATE members SET membership_status = 'inactive' WHERE id = $1 AND church_id = $2 RETURNING id`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Member not found' });
    return res.json({ success: true, message: 'Member deactivated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/members/stats
const getMemberStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE membership_status = 'active') as active,
        COUNT(*) FILTER (WHERE membership_status = 'pending_review') as pending_review,
        COUNT(*) FILTER (WHERE membership_status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE membership_class = 'child') as children,
        COUNT(*) FILTER (WHERE membership_class = 'youth') as youth,
        COUNT(*) FILTER (WHERE gender = 'male') as male,
        COUNT(*) FILTER (WHERE gender = 'female') as female,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
       FROM members WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMembers, getMember, createMember, updateMember, deleteMember, getMemberStats };
