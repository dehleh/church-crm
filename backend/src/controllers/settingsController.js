const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');
const { sendSMS, sendWhatsApp } = require('../services/smsService');

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

// ── Messaging Configuration ───────────────────────────────────

const ALLOWED_MESSAGING_KEYS = [
  'email', 'sms', 'whatsapp',
];

const getMessagingConfig = async (req, res) => {
  try {
    const { rows } = await query('SELECT settings FROM churches WHERE id = $1', [req.churchId]);
    const messaging = rows[0]?.settings?.messaging || {};
    // Mask sensitive keys for the frontend
    const masked = {};
    if (messaging.email) {
      masked.email = {
        provider: messaging.email.provider || 'smtp',
        fromEmail: messaging.email.fromEmail || '',
        fromName: messaging.email.fromName || '',
        smtpHost: messaging.email.smtpHost || '',
        smtpPort: messaging.email.smtpPort || '587',
        smtpUser: messaging.email.smtpUser || '',
        smtpPass: messaging.email.smtpPass ? '••••••••' : '',
        sendgridApiKey: messaging.email.sendgridApiKey ? '••••••••' : '',
        enabled: messaging.email.enabled ?? false,
      };
    } else {
      masked.email = { provider: 'smtp', fromEmail: '', fromName: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', sendgridApiKey: '', enabled: false };
    }
    if (messaging.sms) {
      masked.sms = {
        twilioSid: messaging.sms.twilioSid ? messaging.sms.twilioSid.substring(0, 8) + '••••••••' : '',
        twilioAuthToken: messaging.sms.twilioAuthToken ? '••••••••' : '',
        twilioPhone: messaging.sms.twilioPhone || '',
        enabled: messaging.sms.enabled ?? false,
      };
    } else {
      masked.sms = { twilioSid: '', twilioAuthToken: '', twilioPhone: '', enabled: false };
    }
    if (messaging.whatsapp) {
      masked.whatsapp = {
        whatsappNumber: messaging.whatsapp.whatsappNumber || '',
        enabled: messaging.whatsapp.enabled ?? false,
        usesTwilio: true,
      };
    } else {
      masked.whatsapp = { whatsappNumber: '', enabled: false, usesTwilio: true };
    }
    return res.json({ success: true, data: masked });
  } catch (err) {
    logger.error('getMessagingConfig error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMessagingConfig = async (req, res) => {
  const { email, sms, whatsapp } = req.body;
  try {
    // Load current settings
    const { rows } = await query('SELECT settings FROM churches WHERE id = $1', [req.churchId]);
    const currentSettings = rows[0]?.settings || {};
    const currentMessaging = currentSettings.messaging || {};

    // Merge — preserve masked values (don't overwrite with '••••••••')
    const newMessaging = {};
    if (email) {
      const prev = currentMessaging.email || {};
      newMessaging.email = {
        provider: email.provider || prev.provider || 'smtp',
        fromEmail: email.fromEmail ?? prev.fromEmail,
        fromName: email.fromName ?? prev.fromName,
        smtpHost: email.smtpHost ?? prev.smtpHost,
        smtpPort: email.smtpPort ?? prev.smtpPort,
        smtpUser: email.smtpUser ?? prev.smtpUser,
        smtpPass: (email.smtpPass && !email.smtpPass.includes('••')) ? email.smtpPass : prev.smtpPass,
        sendgridApiKey: (email.sendgridApiKey && !email.sendgridApiKey.includes('••')) ? email.sendgridApiKey : prev.sendgridApiKey,
        enabled: email.enabled ?? prev.enabled ?? false,
      };
    } else {
      newMessaging.email = currentMessaging.email || {};
    }
    if (sms) {
      const prev = currentMessaging.sms || {};
      newMessaging.sms = {
        twilioSid: (sms.twilioSid && !sms.twilioSid.includes('••')) ? sms.twilioSid : prev.twilioSid,
        twilioAuthToken: (sms.twilioAuthToken && !sms.twilioAuthToken.includes('••')) ? sms.twilioAuthToken : prev.twilioAuthToken,
        twilioPhone: sms.twilioPhone ?? prev.twilioPhone,
        enabled: sms.enabled ?? prev.enabled ?? false,
      };
    } else {
      newMessaging.sms = currentMessaging.sms || {};
    }
    if (whatsapp) {
      const prev = currentMessaging.whatsapp || {};
      newMessaging.whatsapp = {
        whatsappNumber: whatsapp.whatsappNumber ?? prev.whatsappNumber,
        enabled: whatsapp.enabled ?? prev.enabled ?? false,
      };
    } else {
      newMessaging.whatsapp = currentMessaging.whatsapp || {};
    }

    const updatedSettings = { ...currentSettings, messaging: newMessaging };
    await query(
      'UPDATE churches SET settings = $2, updated_at = NOW() WHERE id = $1',
      [req.churchId, JSON.stringify(updatedSettings)]
    );
    return res.json({ success: true, message: 'Messaging settings saved' });
  } catch (err) {
    logger.error('updateMessagingConfig error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const testMessaging = async (req, res) => {
  const { channel, recipient } = req.body;
  if (!channel || !recipient) return res.status(400).json({ success: false, message: 'Channel and recipient required' });

  try {
    const { rows } = await query('SELECT settings, name FROM churches WHERE id = $1', [req.churchId]);
    const churchSettings = rows[0]?.settings?.messaging || {};
    const churchName = rows[0]?.name || 'ChurchOS';

    if (channel === 'email') {
      await sendEmail({
        to: recipient,
        subject: `Test Email from ${churchName}`,
        html: `<h2>Hello from ${churchName}!</h2><p>This is a test email sent from your ChurchOS messaging settings. If you received this, your email configuration is working correctly.</p><p><em>Sent at ${new Date().toLocaleString()}</em></p>`,
      }, churchSettings);
      return res.json({ success: true, message: `Test email sent to ${recipient}` });
    }

    if (channel === 'sms') {
      await sendSMS({
        to: recipient,
        body: `Test SMS from ${churchName} (ChurchOS). Your SMS configuration is working! Sent at ${new Date().toLocaleString()}.`,
      }, churchSettings);
      return res.json({ success: true, message: `Test SMS sent to ${recipient}` });
    }

    if (channel === 'whatsapp') {
      await sendWhatsApp({
        to: recipient,
        body: `Test WhatsApp message from ${churchName} (ChurchOS). Your WhatsApp configuration is working! Sent at ${new Date().toLocaleString()}.`,
      }, churchSettings);
      return res.json({ success: true, message: `Test WhatsApp sent to ${recipient}` });
    }

    return res.status(400).json({ success: false, message: 'Invalid channel. Use email, sms, or whatsapp.' });
  } catch (err) {
    logger.error('testMessaging error', { channel, error: err.message });
    return res.status(500).json({ success: false, message: `Test failed: ${err.message}` });
  }
};

module.exports = { getChurchSettings, updateChurchSettings, changePassword, updateProfile, getChurchStats, getMessagingConfig, updateMessagingConfig, testMessaging };
