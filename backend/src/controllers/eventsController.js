const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/events
const getEvents = async (req, res) => {
  const { page = 1, limit = 20, status, type, upcoming, branchId } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['e.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }
    if (type) { conditions.push(`e.event_type = $${idx++}`); params.push(type); }
    if (branchId) { conditions.push(`e.branch_id = $${idx++}`); params.push(branchId); }
    if (upcoming === 'true') { conditions.push(`e.start_datetime >= NOW()`); }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM events e WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT e.*,
              b.name as branch_name,
              u.first_name || ' ' || u.last_name as created_by_name,
              (SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.id) as attendance_count
       FROM events e
       LEFT JOIN branches b ON b.id = e.branch_id
       LEFT JOIN users u ON u.id = e.created_by
       WHERE ${where}
       ORDER BY e.start_datetime DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countRes.rows[0].count / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/events
const createEvent = async (req, res) => {
  const {
    title, description, eventType, startDatetime, endDatetime,
    location, isOnline, onlineLink, expectedAttendance, branchId
  } = req.body;

  try {
    const { rows } = await query(
      `INSERT INTO events (id, church_id, branch_id, title, description, event_type,
        start_datetime, end_datetime, location, is_online, online_link, expected_attendance, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        uuidv4(), req.churchId, branchId || null, title, description || null, eventType || null,
        startDatetime, endDatetime || null, location || null,
        isOnline || false, onlineLink || null, expectedAttendance || null, req.user.id
      ]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/events/:id/attendance
const recordAttendance = async (req, res) => {
  const { id: eventId } = req.params;
  const { memberIds, checkInMethod = 'manual' } = req.body;

  try {
    // Verify event belongs to church
    const eventCheck = await query(
      'SELECT id FROM events WHERE id = $1 AND church_id = $2', [eventId, req.churchId]
    );
    if (!eventCheck.rows[0]) return res.status(404).json({ success: false, message: 'Event not found' });

    // Batch insert with ON CONFLICT to avoid duplicates (no N+1)
    const values = [];
    const params = [];
    let idx = 1;
    for (const memberId of memberIds) {
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(uuidv4(), req.churchId, eventId, memberId, checkInMethod);
    }

    let inserted = [];
    if (values.length > 0) {
      const { rows } = await query(
        `INSERT INTO attendance (id, church_id, event_id, member_id, check_in_method)
         VALUES ${values.join(', ')}
         ON CONFLICT (event_id, member_id) DO NOTHING
         RETURNING *`,
        params
      );
      inserted = rows;
    }

    // Update actual attendance count
    await query(
      `UPDATE events SET actual_attendance = (
        SELECT COUNT(*) FROM attendance WHERE event_id = $1
      ) WHERE id = $1`,
      [eventId]
    );

    return res.json({ success: true, data: inserted, message: `${inserted.length} attendance record(s) added` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/events/:id/attendance
const getEventAttendance = async (req, res) => {
  const { id: eventId } = req.params;
  try {
    const { rows } = await query(
      `SELECT a.*, m.first_name, m.last_name, m.member_number, m.profile_photo_url
       FROM attendance a
       LEFT JOIN members m ON m.id = a.member_id
       WHERE a.event_id = $1 AND a.church_id = $2
       ORDER BY a.check_in_time ASC`,
      [eventId, req.churchId]
    );
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/events/stats
const getEventStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE start_datetime >= DATE_TRUNC('month', NOW())) as this_month,
        AVG(actual_attendance) FILTER (WHERE actual_attendance > 0) as avg_attendance
       FROM events WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getEvents, createEvent, recordAttendance, getEventAttendance, getEventStats };
