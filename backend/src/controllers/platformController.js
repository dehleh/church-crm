const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../config/logger');

const audit = async (actorUserId, action, targetChurchId, details = {}) => {
  try {
    await query(
      `INSERT INTO platform_audit_log (actor_user_id, action, target_church_id, details)
       VALUES ($1, $2, $3, $4)`,
      [actorUserId, action, targetChurchId, details]
    );
  } catch (err) {
    logger.warn('platform audit log failed', { err: err.message });
  }
};

// GET /api/platform/stats
const getPlatformStats = async (req, res) => {
  try {
    const [{ rows: churchStats }, { rows: userStats }, { rows: recent }] = await Promise.all([
      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS suspended,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_30d
      FROM churches`),
      query(`SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '30 days') AS active_30d
      FROM users WHERE is_super_admin = false`),
      query(`SELECT id, name, slug, denomination, is_active, created_at
             FROM churches ORDER BY created_at DESC LIMIT 5`),
    ]);
    return res.json({
      success: true,
      data: {
        churches: churchStats[0],
        users: userStats[0],
        recentChurches: recent,
      },
    });
  } catch (err) {
    logger.error('platform stats error', { err: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/platform/churches
const listChurches = async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let i = 1;
  if (search) {
    conditions.push(`(c.name ILIKE $${i} OR c.slug ILIKE $${i} OR c.denomination ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (status === 'active') conditions.push('c.is_active = true');
  if (status === 'suspended') conditions.push('c.is_active = false');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const countRes = await query(`SELECT COUNT(*) FROM churches c ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM users u WHERE u.church_id = c.id AND u.is_super_admin = false) AS user_count,
        (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) AS member_count,
        (SELECT COUNT(*) FROM branches b WHERE b.church_id = c.id) AS branch_count,
        (SELECT MAX(u.last_login_at) FROM users u WHERE u.church_id = c.id) AS last_login_at
      FROM churches c
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
      params
    );
    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countRes.rows[0].count / limit),
      },
    });
  } catch (err) {
    logger.error('list churches error', { err: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/platform/churches/:id
const getChurch = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM users WHERE church_id = c.id AND is_super_admin = false) AS user_count,
         (SELECT COUNT(*) FROM members WHERE church_id = c.id) AS member_count,
         (SELECT COUNT(*) FROM first_timers WHERE church_id = c.id) AS first_timer_count,
         (SELECT COUNT(*) FROM events WHERE church_id = c.id) AS event_count,
         (SELECT COUNT(*) FROM branches WHERE church_id = c.id) AS branch_count
       FROM churches c WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/platform/churches/:id/suspend
const suspendChurch = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE churches SET is_active = false WHERE id = $1 RETURNING id, name, is_active`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    await audit(req.user.id, 'suspend_church', req.params.id, { reason: req.body?.reason || null });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/platform/churches/:id/activate
const activateChurch = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE churches SET is_active = true WHERE id = $1 RETURNING id, name, is_active`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    await audit(req.user.id, 'activate_church', req.params.id);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/platform/churches/:id  — destructive; cascades via FK
const deleteChurch = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM churches WHERE id = $1 RETURNING id, name`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    await audit(req.user.id, 'delete_church', req.params.id, { name: rows[0].name });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('delete church error', { err: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/platform/audit-log
const getAuditLog = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const { rows } = await query(
      `SELECT a.*, u.first_name, u.last_name, u.email, c.name AS church_name
       FROM platform_audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       LEFT JOIN churches c ON c.id = a.target_church_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/platform/churches  — provision a new church + head_pastor user
// Body: { churchName, churchSlug, denomination?, adminFirstName, adminLastName, adminEmail, adminPhone?, adminPassword? }
// If adminPassword omitted, a strong temp password is generated and returned ONCE.
const createChurch = async (req, res) => {
  const {
    churchName, churchSlug, denomination,
    adminFirstName, adminLastName, adminEmail, adminPhone,
    adminPassword,
  } = req.body;

  // Generate temp password if not provided (16 url-safe chars)
  const generatedPassword = adminPassword
    ? null
    : crypto.randomBytes(12).toString('base64url');
  const passwordToHash = adminPassword || generatedPassword;

  const client = await getClient();
  try {
    // Uniqueness checks
    const slugCheck = await client.query('SELECT id FROM churches WHERE slug = $1', [churchSlug]);
    if (slugCheck.rows.length) {
      client.release();
      return res.status(409).json({ success: false, message: 'Church slug already taken' });
    }
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail.toLowerCase()]);
    if (emailCheck.rows.length) {
      client.release();
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(passwordToHash, 12);
    const churchId = uuidv4();
    const branchId = uuidv4();
    const userId = uuidv4();

    await client.query('BEGIN');
    await client.query(
      `INSERT INTO churches (id, name, slug, denomination) VALUES ($1, $2, $3, $4)`,
      [churchId, churchName, churchSlug, denomination || null]
    );
    await client.query(
      `INSERT INTO branches (id, church_id, name, is_headquarters) VALUES ($1, $2, $3, true)`,
      [branchId, churchId, `${churchName} HQ`]
    );
    await client.query(
      `INSERT INTO users (id, church_id, branch_id, first_name, last_name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'head_pastor')`,
      [userId, churchId, branchId, adminFirstName, adminLastName, adminEmail.toLowerCase(), passwordHash, adminPhone || null]
    );
    for (const cat of ['Tithe', 'Offering', 'Building Fund', 'Welfare', 'Missions']) {
      await client.query(
        `INSERT INTO giving_categories (id, church_id, name) VALUES ($1, $2, $3)`,
        [uuidv4(), churchId, cat]
      );
    }
    await client.query('COMMIT');

    await audit(req.user.id, 'create_church', churchId, {
      name: churchName, slug: churchSlug, adminEmail: adminEmail.toLowerCase(),
      passwordGenerated: !!generatedPassword,
    });

    return res.status(201).json({
      success: true,
      data: {
        church: { id: churchId, name: churchName, slug: churchSlug, denomination: denomination || null },
        admin: { id: userId, firstName: adminFirstName, lastName: adminLastName, email: adminEmail.toLowerCase(), role: 'head_pastor' },
        // Returned only once at creation time so super-admin can share with the customer
        temporaryPassword: generatedPassword,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('platform create church failed', { err: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getPlatformStats,
  listChurches,
  getChurch,
  createChurch,
  suspendChurch,
  activateChurch,
  deleteChurch,
  getAuditLog,
};
