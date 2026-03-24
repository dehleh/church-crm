const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const getChurchSettings = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM churches WHERE id = $1', [req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Church not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateChurchSettings = async (req, res) => {
  const {
    name, address, city, state, country, phone, email, website,
    denomination, timezone, currency, logoUrl, settings
  } = req.body;
  try {
    const { rows } = await query(
      `UPDATE churches SET
        name = COALESCE($2, name),
        address = COALESCE($3, address),
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        country = COALESCE($6, country),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        website = COALESCE($9, website),
        denomination = COALESCE($10, denomination),
        timezone = COALESCE($11, timezone),
        currency = COALESCE($12, currency),
        logo_url = COALESCE($13, logo_url),
        settings = COALESCE($14, settings)
       WHERE id = $1 RETURNING *`,
      [req.churchId, name, address, city, state, country, phone, email, website,
       denomination, timezone, currency, logoUrl, settings ? JSON.stringify(settings) : null]
    );
    return res.json({ success: true, data: rows[0], message: 'Settings updated' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  try {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateProfile = async (req, res) => {
  const { firstName, lastName, phone, avatarUrl } = req.body;
  try {
    const { rows } = await query(
      `UPDATE users SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        avatar_url = COALESCE($5, avatar_url)
       WHERE id = $1
       RETURNING id, first_name, last_name, email, phone, role, avatar_url`,
      [req.user.id, firstName, lastName, phone, avatarUrl]
    );
    return res.json({ success: true, data: rows[0], message: 'Profile updated' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const getChurchStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        (SELECT COUNT(*) FROM members WHERE church_id = $1 AND membership_status = 'active') as active_members,
        (SELECT COUNT(*) FROM branches WHERE church_id = $1 AND is_active = true) as branches,
        (SELECT COUNT(*) FROM users WHERE church_id = $1 AND is_active = true) as staff_users,
        (SELECT COUNT(*) FROM departments WHERE church_id = $1 AND is_active = true) as departments,
        (SELECT COUNT(*) FROM events WHERE church_id = $1) as total_events,
        (SELECT COUNT(*) FROM transactions WHERE church_id = $1) as total_transactions`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getChurchSettings, updateChurchSettings, changePassword, updateProfile, getChurchStats };
