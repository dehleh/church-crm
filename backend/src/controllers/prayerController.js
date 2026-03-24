const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getPrayerRequests = async (req, res) => {
  const { page = 1, limit = 20, status, category } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['pr.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (status) { conditions.push(`pr.status = $${idx++}`); params.push(status); }
    if (category) { conditions.push(`pr.category = $${idx++}`); params.push(category); }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM prayer_requests pr WHERE ${where}`, params);
    params.push(parseInt(limit), offset);

    const { rows } = await query(
      `SELECT pr.*,
        CASE WHEN pr.is_anonymous THEN 'Anonymous' ELSE COALESCE(m.first_name || ' ' || m.last_name, pr.requester_name) END as display_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
       FROM prayer_requests pr
       LEFT JOIN members m ON m.id = pr.member_id
       LEFT JOIN users u ON u.id = pr.assigned_to
       WHERE ${where}
       ORDER BY pr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createPrayerRequest = async (req, res) => {
  const { request, category, isAnonymous, memberId, requesterName, branchId } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO prayer_requests (id, church_id, branch_id, member_id, requester_name, request, category, is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), req.churchId, branchId || null, memberId || null, requesterName || null, request, category || null, isAnonymous || false]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updatePrayerStatus = async (req, res) => {
  const { id } = req.params;
  const { status, responseNotes, assignedTo } = req.body;
  try {
    const { rows } = await query(
      `UPDATE prayer_requests SET
        status = COALESCE($3, status),
        response_notes = COALESCE($4, response_notes),
        assigned_to = COALESCE($5, assigned_to)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, status, responseNotes, assignedTo]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Prayer request not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getPrayerRequests, createPrayerRequest, updatePrayerStatus };
