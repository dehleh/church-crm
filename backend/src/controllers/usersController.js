const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');

const generateSecurePassword = () => {
  return crypto.randomBytes(12).toString('base64url').slice(0, 16) + 'A1!';
};

const getUsers = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.is_active,
              u.last_login_at, u.created_at, u.force_password_change, u.branch_id, u.department_id,
              b.name as branch_name, d.name as department_name
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.church_id=$1 ORDER BY u.created_at DESC`, [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const inviteUser = async (req, res) => {
  const { firstName, lastName, email, phone, role, branchId, departmentId } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE church_id=$1 AND email=$2', [req.churchId, email]);
    if (existing.rows[0]) return res.status(409).json({ success: false, message: 'Email already exists in this church' });
    const tempPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const { rows } = await query(
      `INSERT INTO users (id, church_id, branch_id, department_id, first_name, last_name, email, phone, role, password_hash, force_password_change)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING id, first_name, last_name, email, role, department_id`,
      [uuidv4(), req.churchId, branchId||null, departmentId||null, firstName, lastName, email, phone||null, role||'hod', passwordHash]
    );

    // Send temp password via email only
    try {
      await sendEmail({
        to: email,
        subject: 'Your ChurchOS Account',
        html: `<p>Hello ${firstName},</p><p>An account has been created for you. Your temporary password is: <strong>${tempPassword}</strong></p><p>Please change your password on first login.</p>`,
      });
    } catch (emailErr) {
      logger.warn('Failed to send invite email', { email, error: emailErr.message });
    }

    // Audit log
    logger.info('User invited', { action: 'user_invite', performedBy: req.user.id, targetEmail: email, churchId: req.churchId });

    return res.status(201).json({ success: true, data: rows[0], message: 'User invited. Credentials sent via email.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, role, branchId, departmentId, isActive } = req.body;
  if (id === req.user.id && role && role !== req.user.role) {
    return res.status(400).json({ success: false, message: 'Cannot change your own role' });
  }
  try {
    const { rows } = await query(
      `UPDATE users SET first_name=COALESCE($3,first_name), last_name=COALESCE($4,last_name),
       phone=COALESCE($5,phone), role=COALESCE($6,role), branch_id=COALESCE($7,branch_id),
       department_id=COALESCE($8,department_id),
       is_active=COALESCE($9,is_active)
       WHERE id=$1 AND church_id=$2 RETURNING id,first_name,last_name,email,role,is_active,department_id`,
      [id, req.churchId, firstName, lastName, phone, role, branchId, departmentId, isActive]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });

    // Audit log for role/status changes
    if (role || isActive !== undefined) {
      logger.info('User updated', { action: 'user_update', performedBy: req.user.id, targetUser: id, changes: { role, isActive, departmentId }, churchId: req.churchId });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  try {
    const tempPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const { rows } = await query(
      'UPDATE users SET password_hash=$3, force_password_change=true WHERE id=$1 AND church_id=$2 RETURNING email, first_name',
      [id, req.churchId, passwordHash]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });

    // Send new password via email only
    try {
      await sendEmail({
        to: rows[0].email,
        subject: 'Password Reset — ChurchOS',
        html: `<p>Hello ${rows[0].first_name},</p><p>Your password has been reset. Your new temporary password is: <strong>${tempPassword}</strong></p><p>Please change your password on next login.</p>`,
      });
    } catch (emailErr) {
      logger.warn('Failed to send reset email', { email: rows[0].email, error: emailErr.message });
    }

    // Audit log
    logger.info('Password reset', { action: 'password_reset', performedBy: req.user.id, targetUser: id, churchId: req.churchId });

    return res.json({ success: true, message: 'Password reset. New credentials sent via email.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === 'true';

  if (id === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own user account' });
  }

  try {
    const { rows: targetUsers } = await query(
      'SELECT id, first_name, last_name, email, role, is_active FROM users WHERE id = $1 AND church_id = $2',
      [id, req.churchId]
    );
    if (!targetUsers[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const targetUser = targetUsers[0];

    // Ensure we do not delete the last remaining active admin/head pastor
    if (['admin', 'head_pastor'].includes(targetUser.role)) {
      const { rows: remainingAdmins } = await query(
        `SELECT COUNT(*)::int as count FROM users 
         WHERE church_id = $1 AND id != $2 AND role IN ('admin', 'head_pastor') AND is_active = true`,
        [req.churchId, id]
      );
      if ((remainingAdmins[0]?.count || 0) < 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the sole remaining Church Admin. Please assign another admin first.'
        });
      }
    }

    if (isPermanent) {
      // Nullify references in related tables to avoid FK constraint violations
      await query('UPDATE events SET created_by = NULL WHERE created_by = $1', [id]).catch(() => {});
      await query('UPDATE budgets SET created_by = NULL WHERE created_by = $1', [id]).catch(() => {});
      await query('UPDATE transactions SET recorded_by = NULL WHERE recorded_by = $1', [id]).catch(() => {});
      await query('UPDATE transactions SET approved_by = NULL WHERE approved_by = $1', [id]).catch(() => {});
      await query('UPDATE first_timers SET follow_up_assigned_to = NULL WHERE follow_up_assigned_to = $1', [id]).catch(() => {});
      await query('UPDATE follow_ups SET assigned_to = NULL WHERE assigned_to = $1', [id]).catch(() => {});
      await query('UPDATE procurement_requisitions SET raised_by = NULL WHERE raised_by = $1', [id]).catch(() => {});
      await query('UPDATE procurement_requisitions SET approved_by = NULL WHERE approved_by = $1', [id]).catch(() => {});
      await query('UPDATE purchase_orders SET raised_by = NULL WHERE raised_by = $1', [id]).catch(() => {});
      await query('UPDATE purchase_orders SET reviewed_by = NULL WHERE reviewed_by = $1', [id]).catch(() => {});
      await query('UPDATE giving_campaigns SET created_by = NULL WHERE created_by = $1', [id]).catch(() => {});
      await query('UPDATE services SET created_by = NULL WHERE created_by = $1', [id]).catch(() => {});
      await query('UPDATE pastoral_meeting_requests SET pastor_user_id = NULL WHERE pastor_user_id = $1', [id]).catch(() => {});
      await query('UPDATE department_service_checklists SET hod_user_id = NULL WHERE hod_user_id = $1', [id]).catch(() => {});
      await query('UPDATE department_service_checklist_items SET completed_by_user_id = NULL WHERE completed_by_user_id = $1', [id]).catch(() => {});
      await query('UPDATE children_checkins SET checked_in_by = NULL WHERE checked_in_by = $1', [id]).catch(() => {});
      await query('UPDATE children_checkins SET checked_out_by = NULL WHERE checked_out_by = $1', [id]).catch(() => {});

      const { rows } = await query(
        'DELETE FROM users WHERE id = $1 AND church_id = $2 RETURNING id, first_name, last_name, email',
        [id, req.churchId]
      );
      if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });

      logger.info('User permanently deleted', {
        action: 'user_delete_permanent',
        performedBy: req.user.id,
        targetUser: id,
        targetEmail: targetUser.email,
        churchId: req.churchId
      });

      return res.json({
        success: true,
        message: `User ${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}) permanently deleted.`
      });
    } else {
      // Soft-delete / deactivate user
      const { rows } = await query(
        'UPDATE users SET is_active = false WHERE id = $1 AND church_id = $2 RETURNING id, first_name, last_name, email',
        [id, req.churchId]
      );
      if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });

      logger.info('User deactivated', {
        action: 'user_deactivate',
        performedBy: req.user.id,
        targetUser: id,
        targetEmail: targetUser.email,
        churchId: req.churchId
      });

      return res.json({
        success: true,
        message: `User ${targetUser.first_name} ${targetUser.last_name} deactivated.`
      });
    }
  } catch (err) {
    logger.error('deleteUser error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUsers, inviteUser, updateUser, resetUserPassword, deleteUser };
