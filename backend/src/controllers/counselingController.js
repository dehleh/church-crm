const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getCounselingSessions = async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['cs.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    if (status) { conditions.push(`cs.status = $${idx++}`); params.push(status); }
    if (type) { conditions.push(`cs.session_type = $${idx++}`); params.push(type); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM counseling_sessions cs WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT cs.*,
        COALESCE(m.first_name || ' ' || m.last_name, ft.first_name || ' ' || ft.last_name, cs.requester_name) as requester_display_name,
        u.first_name || ' ' || u.last_name as counselor_name
       FROM counseling_sessions cs
       LEFT JOIN members m ON m.id = cs.member_id
       LEFT JOIN first_timers ft ON ft.id = cs.first_timer_id
       LEFT JOIN users u ON u.id = cs.counselor_id
       WHERE ${where}
       ORDER BY cs.scheduled_at ASC NULLS LAST, cs.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, params
    );
    return res.json({
      success: true, data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) }
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createCounselingSession = async (req, res) => {
  const { memberId, firstTimerId, requesterName, counselorId, sessionType, scheduledAt, notes } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO counseling_sessions (id, church_id, member_id, first_timer_id, requester_name, counselor_id, session_type, scheduled_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.churchId, memberId||null, firstTimerId||null, requesterName||null, counselorId||null, sessionType||'general', scheduledAt||null, notes||null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateCounselingSession = async (req, res) => {
  const { id } = req.params;
  const { status, counselorNotes, scheduledAt, completedAt, durationMinutes, counselorId } = req.body;
  try {
    const { rows } = await query(
      `UPDATE counseling_sessions SET
        status = COALESCE($3, status),
        counselor_notes = COALESCE($4, counselor_notes),
        scheduled_at = COALESCE($5, scheduled_at),
        completed_at = COALESCE($6, completed_at),
        duration_minutes = COALESCE($7, duration_minutes),
        counselor_id = COALESCE($8, counselor_id)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, status, counselorNotes, scheduledAt, completedAt, durationMinutes, counselorId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Session not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getCounselingStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM counseling_sessions WHERE church_id = $1`, [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getCounselingSessions, createCounselingSession, updateCounselingSession, getCounselingStats };
