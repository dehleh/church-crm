const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// --- Welfare Packages ---
const getPackages = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT wp.*, 
        COUNT(wa.id) FILTER (WHERE wa.status = 'pending') as pending_applications,
        COUNT(wa.id) as total_applications
       FROM welfare_packages wp
       LEFT JOIN welfare_applications wa ON wa.package_id = wp.id
       WHERE wp.church_id = $1
       GROUP BY wp.id
       ORDER BY wp.created_at DESC`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createPackage = async (req, res) => {
  const { name, description, packageType, branchId } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO welfare_packages (id, church_id, branch_id, name, description, package_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuidv4(), req.churchId, branchId||null, name, description||null, packageType||'financial']
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

// --- Welfare Applications ---
const getApplications = async (req, res) => {
  const { page = 1, limit = 20, status, packageId } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['wa.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    if (status) { conditions.push(`wa.status = $${idx++}`); params.push(status); }
    if (packageId) { conditions.push(`wa.package_id = $${idx++}`); params.push(packageId); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM welfare_applications wa WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT wa.*,
        wp.name as package_name, wp.package_type,
        COALESCE(m.first_name || ' ' || m.last_name, ft.first_name || ' ' || ft.last_name, wa.applicant_name) as applicant_display_name,
        u.first_name || ' ' || u.last_name as reviewed_by_name
       FROM welfare_applications wa
       LEFT JOIN welfare_packages wp ON wp.id = wa.package_id
       LEFT JOIN members m ON m.id = wa.member_id
       LEFT JOIN first_timers ft ON ft.id = wa.first_timer_id
       LEFT JOIN users u ON u.id = wa.reviewed_by
       WHERE ${where}
       ORDER BY wa.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, params
    );
    return res.json({
      success: true, data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) }
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createApplication = async (req, res) => {
  const { packageId, memberId, firstTimerId, applicantName, reason, amountRequested } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO welfare_applications (id, church_id, package_id, member_id, first_timer_id, applicant_name, reason, amount_requested)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), req.churchId, packageId, memberId||null, firstTimerId||null, applicantName||null, reason, amountRequested||null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const reviewApplication = async (req, res) => {
  const { id } = req.params;
  const { status, amountApproved, reviewNotes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE welfare_applications SET
        status = COALESCE($3, status),
        amount_approved = COALESCE($4, amount_approved),
        review_notes = COALESCE($5, review_notes),
        reviewed_by = $6,
        reviewed_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, status, amountApproved, reviewNotes, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Application not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getWelfareStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        (SELECT COUNT(*) FROM welfare_packages WHERE church_id = $1 AND is_active = true) as active_packages,
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved' OR status = 'disbursed') as approved,
        COALESCE(SUM(amount_approved) FILTER (WHERE status = 'disbursed'), 0) as total_disbursed
       FROM welfare_applications WHERE church_id = $1`, [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getPackages, createPackage, getApplications, createApplication, reviewApplication, getWelfareStats };
