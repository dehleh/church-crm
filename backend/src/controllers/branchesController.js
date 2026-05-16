const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getBranches = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM members m WHERE m.branch_id = b.id AND m.membership_status = 'active') as member_count,
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.is_active = true) as staff_count
       FROM branches b
       WHERE b.church_id = $1 AND b.is_active = true
       ORDER BY b.is_headquarters DESC, b.name ASC`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getBranch = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM members m WHERE m.branch_id = b.id) as member_count,
        (SELECT COUNT(*) FROM departments d WHERE d.branch_id = b.id AND d.is_active = true) as department_count,
        (SELECT COUNT(*) FROM events e WHERE e.branch_id = b.id AND e.status = 'upcoming') as upcoming_events
       FROM branches b WHERE b.id = $1 AND b.church_id = $2`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Branch not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createBranch = async (req, res) => {
  const { name, code, address, city, state, phone, email, pastorName } = req.body;
  try {
    // Enforce single-branch / plan limits unless whitelisted or super admin
    const churchRes = await query(
      `SELECT multi_branch_enabled, is_whitelisted, branch_limit, subscription_plan
       FROM churches WHERE id = $1`,
      [req.churchId]
    );
    const church = churchRes.rows[0];
    if (!church) return res.status(404).json({ success: false, message: 'Church not found' });

    if (!req.user?.is_super_admin && !church.is_whitelisted) {
      const countRes = await query(
        `SELECT COUNT(*)::int AS n FROM branches WHERE church_id = $1 AND is_active = true`,
        [req.churchId]
      );
      const current = countRes.rows[0].n;

      if (!church.multi_branch_enabled && current >= 1) {
        return res.status(403).json({
          success: false,
          code: 'MULTI_BRANCH_DISABLED',
          message: 'Multi-branch is disabled for your church. Upgrade your plan to add more branches.',
        });
      }
      if (church.branch_limit != null && current >= church.branch_limit) {
        return res.status(403).json({
          success: false,
          code: 'BRANCH_LIMIT_REACHED',
          message: `You have reached your plan's limit of ${church.branch_limit} branches.`,
        });
      }
    }

    const { rows } = await query(
      `INSERT INTO branches (id, church_id, name, code, address, city, state, phone, email, pastor_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuidv4(), req.churchId, name, code || null, address || null, city || null, state || null, phone || null, email || null, pastorName || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateBranch = async (req, res) => {
  const { id } = req.params;
  const { name, code, address, city, state, phone, email, pastorName } = req.body;
  try {
    const { rows } = await query(
      `UPDATE branches SET
        name = COALESCE($3, name), code = COALESCE($4, code),
        address = COALESCE($5, address), city = COALESCE($6, city),
        state = COALESCE($7, state), phone = COALESCE($8, phone),
        email = COALESCE($9, email), pastor_name = COALESCE($10, pastor_name)
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId, name, code, address, city, state, phone, email, pastorName]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Branch not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getBranches, getBranch, createBranch, updateBranch };
