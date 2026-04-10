const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getFirstTimers = async (req, res) => {
  const { page = 1, limit = 20, search, followUpStatus, branchId } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['ft.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(ft.first_name ILIKE $${idx} OR ft.last_name ILIKE $${idx} OR ft.phone ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (followUpStatus) { conditions.push(`ft.follow_up_status = $${idx++}`); params.push(followUpStatus); }
    if (branchId) { conditions.push(`ft.branch_id = $${idx++}`); params.push(branchId); }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM first_timers ft WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT ft.*,
              b.name as branch_name,
              u.first_name || ' ' || u.last_name as assigned_to_name
       FROM first_timers ft
       LEFT JOIN branches b ON b.id = ft.branch_id
       LEFT JOIN users u ON u.id = ft.follow_up_assigned_to
       WHERE ${where}
       ORDER BY ft.visit_date DESC
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

const createFirstTimer = async (req, res) => {
  const {
    firstName, lastName, email, phone, address, gender, dateOfBirth,
    howDidYouHear, visitDate, serviceAttended, prayerRequest, branchId
  } = req.body;

  try {
    const { rows } = await query(
      `INSERT INTO first_timers (
        id, church_id, branch_id, first_name, last_name, email, phone, address,
        gender, date_of_birth, how_did_you_hear, visit_date, service_attended, prayer_request
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        uuidv4(), req.churchId, branchId || null, firstName, lastName, email || null,
        phone || null, address || null, gender || null, dateOfBirth || null,
        howDidYouHear || null, visitDate || new Date(), serviceAttended || null, prayerRequest || null
      ]
    );

    // Also create a prayer request if one was provided
    if (prayerRequest && prayerRequest.trim()) {
      await query(
        `INSERT INTO prayer_requests (id, church_id, branch_id, first_timer_id, requester_name, request, category, is_anonymous)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), req.churchId, branchId || null, rows[0].id, `${firstName} ${lastName}`, prayerRequest, 'others', false]
      );
    }

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFollowUpStatus = async (req, res) => {
  const { id } = req.params;
  const { followUpStatus, followUpNotes, followUpAssignedTo } = req.body;
  try {
    const { rows } = await query(
      `UPDATE first_timers
       SET follow_up_status = COALESCE($3, follow_up_status),
           follow_up_notes = COALESCE($4, follow_up_notes),
           follow_up_assigned_to = COALESCE($5, follow_up_assigned_to)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, followUpStatus, followUpNotes, followUpAssignedTo]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const convertToMember = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: ftRows } = await query(
      'SELECT * FROM first_timers WHERE id = $1 AND church_id = $2',
      [id, req.churchId]
    );
    if (!ftRows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });

    const ft = ftRows[0];
    const countRes = await query('SELECT COUNT(*) FROM members WHERE church_id = $1', [req.churchId]);
    const memberNumber = `MBR-${String(parseInt(countRes.rows[0].count) + 1).padStart(5, '0')}`;
    const memberId = uuidv4();

    const { rows: memberRows } = await query(
      `INSERT INTO members (id, church_id, branch_id, member_number, first_name, last_name,
        email, phone, gender, date_of_birth, address, join_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE) RETURNING *`,
      [memberId, req.churchId, ft.branch_id, memberNumber, ft.first_name, ft.last_name,
       ft.email, ft.phone, ft.gender, ft.date_of_birth, ft.address]
    );

    await query(
      `UPDATE first_timers SET converted_to_member = true, member_id = $1, follow_up_status = 'converted'
       WHERE id = $2`,
      [memberId, id]
    );

    return res.json({ success: true, data: memberRows[0], message: 'First timer converted to member' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFirstTimerStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE follow_up_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE follow_up_status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE follow_up_status = 'converted') as converted,
        COUNT(*) FILTER (WHERE visit_date >= NOW() - INTERVAL '30 days') as this_month
       FROM first_timers WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFirstTimer = async (req, res) => {
  const { id } = req.params;
  const {
    firstName, lastName, email, phone, address, gender, dateOfBirth,
    howDidYouHear, visitDate, serviceAttended, prayerRequest, branchId
  } = req.body;
  try {
    const { rows } = await query(
      `UPDATE first_timers SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        address = COALESCE($7, address),
        gender = COALESCE($8, gender),
        date_of_birth = COALESCE($9, date_of_birth),
        how_did_you_hear = COALESCE($10, how_did_you_hear),
        visit_date = COALESCE($11, visit_date),
        service_attended = COALESCE($12, service_attended),
        prayer_request = COALESCE($13, prayer_request),
        branch_id = COALESCE($14, branch_id)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, firstName, lastName, email, phone, address, gender,
       dateOfBirth || null, howDidYouHear, visitDate, serviceAttended, prayerRequest, branchId || null]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'First timer not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getFirstTimers, createFirstTimer, updateFirstTimer, updateFollowUpStatus, convertToMember, getFirstTimerStats };
