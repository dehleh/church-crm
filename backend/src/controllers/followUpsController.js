const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getFollowUps = async (req, res) => {
  const { page = 1, limit = 20, status, type, assignedTo } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['f.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    if (status)     { conditions.push(`f.status = $${idx++}`);      params.push(status); }
    if (type)       { conditions.push(`f.follow_up_type = $${idx++}`); params.push(type); }
    if (assignedTo) { conditions.push(`f.assigned_to = $${idx++}`); params.push(assignedTo); }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM follow_ups f WHERE ${where}`, params);
    params.push(parseInt(limit), offset);

    const { rows } = await query(
      `SELECT f.*,
        COALESCE(m.first_name || ' ' || m.last_name, ft.first_name || ' ' || ft.last_name) as person_name,
        CASE WHEN f.member_id IS NOT NULL THEN 'member' ELSE 'first_timer' END as person_type,
        COALESCE(m.phone, ft.phone) as person_phone,
        u.first_name || ' ' || u.last_name as assigned_to_name
       FROM follow_ups f
       LEFT JOIN members m ON m.id = f.member_id
       LEFT JOIN first_timers ft ON ft.id = f.first_timer_id
       LEFT JOIN users u ON u.id = f.assigned_to
       WHERE ${where}
       ORDER BY f.scheduled_at ASC NULLS LAST, f.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count), page: parseInt(page),
        limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit)
      }
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createFollowUp = async (req, res) => {
  const { memberId, firstTimerId, assignedTo, followUpType, scheduledAt, notes } = req.body;
  if (!memberId && !firstTimerId) return res.status(400).json({ success: false, message: 'Member or first timer required' });
  try {
    const { rows } = await query(
      `INSERT INTO follow_ups (id, church_id, member_id, first_timer_id, assigned_to, follow_up_type, scheduled_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), req.churchId, memberId || null, firstTimerId || null, assignedTo || null, followUpType || 'call', scheduledAt || null, notes || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateFollowUp = async (req, res) => {
  const { id } = req.params;
  const { status, notes, outcome, completedAt, scheduledAt } = req.body;
  try {
    const { rows } = await query(
      `UPDATE follow_ups SET
        status = COALESCE($3, status),
        notes = COALESCE($4, notes),
        outcome = COALESCE($5, outcome),
        completed_at = COALESCE($6, completed_at),
        scheduled_at = COALESCE($7, scheduled_at)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, status, notes, outcome, completedAt, scheduledAt]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Follow-up not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getFollowUpStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE scheduled_at < NOW() AND status != 'completed') as overdue
       FROM follow_ups WHERE church_id = $1`, [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getMyFollowUps = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT f.*,
        COALESCE(m.first_name || ' ' || m.last_name, ft.first_name || ' ' || ft.last_name) as person_name,
        COALESCE(m.phone, ft.phone) as person_phone,
        CASE WHEN f.member_id IS NOT NULL THEN 'member' ELSE 'first_timer' END as person_type
       FROM follow_ups f
       LEFT JOIN members m ON m.id = f.member_id
       LEFT JOIN first_timers ft ON ft.id = f.first_timer_id
       WHERE f.church_id = $1 AND f.assigned_to = $2 AND f.status != 'completed'
       ORDER BY f.scheduled_at ASC NULLS LAST LIMIT 20`,
      [req.churchId, req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getFollowUps, createFollowUp, updateFollowUp, getFollowUpStats, getMyFollowUps };
