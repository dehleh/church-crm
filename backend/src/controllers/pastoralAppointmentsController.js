const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { sendSMS, sendWhatsApp } = require('../services/smsService');

/**
 * Format meeting time for notifications.
 */
function formatMeetingTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(isoString);
  }
}

/**
 * Create one or multiple pastoral appointments / summons ("Pastor wants to see you").
 * Dispatches optional instant WhatsApp and SMS notices.
 */
const createAppointment = async (req, res) => {
  const {
    memberIds,
    memberId,
    title = 'Pastoral Meeting Request',
    meetingTime,
    venue = "Pastor's Office",
    urgency = 'normal',
    notes,
    pastorName,
    sendWhatsApp: notifyWhatsApp = true,
    sendSms: notifySms = false,
  } = req.body;

  if (!meetingTime) {
    return res.status(400).json({ success: false, message: 'Meeting date and time are required' });
  }

  const rawIds = Array.isArray(memberIds) && memberIds.length > 0
    ? memberIds
    : (memberId ? [memberId] : []);

  if (rawIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one member must be selected' });
  }

  const resolvedPastorName = (pastorName || '').trim() ||
    (req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : '') ||
    'Senior Pastor';

  try {
    // 1. Fetch targeted members
    const { rows: members } = await query(
      `SELECT id, first_name, last_name, phone, email FROM members
       WHERE id = ANY($1::uuid[]) AND church_id = $2`,
      [rawIds, req.churchId]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid members found for this church' });
    }

    // 2. Fetch church settings for notification config
    const { rows: chRows } = await query(
      'SELECT name, settings FROM churches WHERE id = $1',
      [req.churchId]
    );
    const church = chRows[0] || {};
    const churchSettings = church.settings || {};

    const notificationChannels = ['in_app'];
    if (notifyWhatsApp) notificationChannels.push('whatsapp');
    if (notifySms) notificationChannels.push('sms');

    const created = [];
    const formattedTime = formatMeetingTime(meetingTime);
    const targetPhones = [];

    // 3. Insert appointment for each member
    for (const mem of members) {
      const apptId = uuidv4();
      const { rows } = await query(
        `INSERT INTO pastoral_appointments (
          id, church_id, branch_id, pastor_user_id, pastor_name,
          member_id, title, meeting_time, venue, urgency, notes,
          status, notification_sent, notification_channels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13)
        RETURNING *`,
        [
          apptId,
          req.churchId,
          req.branchId || null,
          req.user?.id || null,
          resolvedPastorName,
          mem.id,
          title.trim(),
          new Date(meetingTime),
          venue.trim(),
          urgency,
          notes ? notes.trim() : null,
          Boolean(notifyWhatsApp || notifySms),
          notificationChannels,
        ]
      );

      created.push({
        ...rows[0],
        member_name: `${mem.first_name} ${mem.last_name}`.trim(),
        member_phone: mem.phone,
      });

      if (mem.phone) {
        targetPhones.push(mem.phone);
      }
    }

    // 4. Dispatch SMS / WhatsApp if requested
    if (targetPhones.length > 0 && (notifyWhatsApp || notifySms)) {
      const churchName = church.name || 'Church';
      const urgencyPrefix = urgency === 'urgent' ? '⚠️ URGENT ' : urgency === 'high' ? '📌 ' : '';
      const noticeBody = `${urgencyPrefix}PASTORAL NOTICE from ${churchName}: Pastor ${resolvedPastorName} requests to see you on ${formattedTime} at ${venue}.${notes ? `\nPurpose/Note: ${notes}` : ''}\nPlease confirm your attendance via the Member Portal or reply to this notice.`;

      if (notifyWhatsApp) {
        sendWhatsApp({ to: targetPhones, body: noticeBody }, churchSettings).catch(err => {
          logger.warn('Failed to send pastoral notice via WhatsApp', { error: err.message });
        });
      }

      if (notifySms) {
        sendSMS({ to: targetPhones, body: noticeBody }, churchSettings).catch(err => {
          logger.warn('Failed to send pastoral notice via SMS', { error: err.message });
        });
      }
    }

    return res.status(201).json({
      success: true,
      count: created.length,
      data: created,
      message: `Pastoral announcement successfully dispatched to ${created.length} member(s).`,
    });
  } catch (err) {
    logger.error('createAppointment failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error creating pastoral announcement' });
  }
};

/**
 * List pastoral appointments for church / branch.
 */
const listAppointments = async (req, res) => {
  const { page = 1, limit = 50, status, urgency, search, memberId } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = ['pa.church_id = $1'];
    const params = [req.churchId];
    let idx = 2;

    if (req.branchId) {
      conditions.push(`pa.branch_id = $${idx++}`);
      params.push(req.branchId);
    } else if (req.query.branchId) {
      conditions.push(`pa.branch_id = $${idx++}`);
      params.push(req.query.branchId);
    }

    if (status && status !== 'all') {
      conditions.push(`pa.status = $${idx++}`);
      params.push(status);
    }

    if (urgency && urgency !== 'all') {
      conditions.push(`pa.urgency = $${idx++}`);
      params.push(urgency);
    }

    if (memberId) {
      conditions.push(`pa.member_id = $${idx++}`);
      params.push(memberId);
    }

    if (search) {
      conditions.push(`(
        m.first_name ILIKE $${idx} OR
        m.last_name ILIKE $${idx} OR
        m.phone ILIKE $${idx} OR
        pa.title ILIKE $${idx} OR
        pa.pastor_name ILIKE $${idx} OR
        pa.venue ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await query(
      `SELECT COUNT(*) FROM pastoral_appointments pa
       JOIN members m ON m.id = pa.member_id
       WHERE ${whereClause}`,
      params
    );

    const dataParams = [...params, parseInt(limit, 10), offset];
    const { rows } = await query(
      `SELECT
         pa.*,
         m.first_name || ' ' || m.last_name AS member_name,
         m.phone AS member_phone,
         m.email AS member_email,
         m.profile_photo_url AS member_photo_url,
         m.membership_status AS member_status
       FROM pastoral_appointments pa
       JOIN members m ON m.id = pa.member_id
       WHERE ${whereClause}
       ORDER BY pa.meeting_time DESC, pa.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(countRes.rows[0].count / limit),
      },
    });
  } catch (err) {
    logger.error('listAppointments failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error listing pastoral appointments' });
  }
};

/**
 * Get single pastoral appointment details.
 */
const getAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT
         pa.*,
         m.first_name || ' ' || m.last_name AS member_name,
         m.phone AS member_phone,
         m.email AS member_email,
         m.profile_photo_url AS member_photo_url
       FROM pastoral_appointments pa
       JOIN members m ON m.id = pa.member_id
       WHERE pa.id = $1 AND pa.church_id = $2`,
      [id, req.churchId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Pastoral appointment not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getAppointment failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Update pastoral appointment status (e.g. 'acknowledged', 'completed', 'cancelled').
 */
const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['pending', 'acknowledged', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const { rows } = await query(
      `UPDATE pastoral_appointments
       SET status = $1,
           notes = COALESCE($2, notes),
           acknowledged_at = CASE WHEN $1 = 'acknowledged' AND acknowledged_at IS NULL THEN NOW() ELSE acknowledged_at END,
           updated_at = NOW()
       WHERE id = $3 AND church_id = $4
       RETURNING *`,
      [status, notes !== undefined ? notes : null, id, req.churchId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Pastoral appointment not found' });
    }

    return res.json({
      success: true,
      data: rows[0],
      message: `Pastoral appointment status updated to ${status}`,
    });
  } catch (err) {
    logger.error('updateAppointmentStatus failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating appointment' });
  }
};

/**
 * Resend notification for a pastoral appointment.
 */
const resendNotification = async (req, res) => {
  const { id } = req.params;
  const { sendWhatsApp: notifyWhatsApp = true, sendSms: notifySms = false } = req.body;

  try {
    const { rows } = await query(
      `SELECT pa.*, m.first_name, m.last_name, m.phone, c.name as church_name, c.settings as church_settings
       FROM pastoral_appointments pa
       JOIN members m ON m.id = pa.member_id
       JOIN churches c ON c.id = pa.church_id
       WHERE pa.id = $1 AND pa.church_id = $2`,
      [id, req.churchId]
    );

    const appt = rows[0];
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Pastoral appointment not found' });
    }

    if (!appt.phone) {
      return res.status(400).json({ success: false, message: 'Member does not have a phone number on file' });
    }

    const formattedTime = formatMeetingTime(appt.meeting_time);
    const urgencyPrefix = appt.urgency === 'urgent' ? '⚠️ URGENT ' : appt.urgency === 'high' ? '📌 ' : '';
    const noticeBody = `${urgencyPrefix}PASTORAL NOTICE REMINDER from ${appt.church_name}: Pastor ${appt.pastor_name} requests to see you on ${formattedTime} at ${appt.venue}.${appt.notes ? `\nPurpose/Note: ${appt.notes}` : ''}\nPlease confirm your attendance via the Member Portal or reply to this notice.`;

    if (notifyWhatsApp) {
      await sendWhatsApp({ to: appt.phone, body: noticeBody }, appt.church_settings);
    }
    if (notifySms) {
      await sendSMS({ to: appt.phone, body: noticeBody }, appt.church_settings);
    }

    await query(
      'UPDATE pastoral_appointments SET notification_sent = true, updated_at = NOW() WHERE id = $1',
      [id]
    );

    return res.json({ success: true, message: 'Pastoral notice resent successfully' });
  } catch (err) {
    logger.error('resendNotification failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error resending notice' });
  }
};

/**
 * Delete a pastoral appointment.
 */
const deleteAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      'DELETE FROM pastoral_appointments WHERE id = $1 AND church_id = $2 RETURNING id',
      [id, req.churchId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Pastoral appointment not found' });
    }

    return res.json({ success: true, message: 'Pastoral appointment deleted successfully' });
  } catch (err) {
    logger.error('deleteAppointment failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error deleting appointment' });
  }
};

/**
 * Member Portal: Fetch member's own pastoral appointments.
 */
const getMyPastoralAppointments = async (req, res) => {
  try {
    const memberId = req.member.id;
    const { rows } = await query(
      `SELECT
         id, pastor_name, title, meeting_time, venue, urgency, notes,
         status, acknowledged_at, created_at
       FROM pastoral_appointments
       WHERE member_id = $1 AND church_id = $2
       ORDER BY CASE WHEN status = 'pending' THEN 1 WHEN status = 'acknowledged' THEN 2 ELSE 3 END, meeting_time ASC`,
      [memberId, req.churchId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getMyPastoralAppointments failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Member Portal: Acknowledge a pastoral appointment.
 */
const acknowledgeMyAppointment = async (req, res) => {
  const { id } = req.params;
  const memberId = req.member.id;

  try {
    const { rows } = await query(
      `UPDATE pastoral_appointments
       SET status = 'acknowledged',
           acknowledged_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND member_id = $2 AND church_id = $3
       RETURNING *`,
      [id, memberId, req.churchId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Pastoral appointment not found' });
    }

    return res.json({
      success: true,
      data: rows[0],
      message: 'You have successfully confirmed and acknowledged this pastoral meeting request.',
    });
  } catch (err) {
    logger.error('acknowledgeMyAppointment failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error acknowledging appointment' });
  }
};

module.exports = {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointmentStatus,
  resendNotification,
  deleteAppointment,
  getMyPastoralAppointments,
  acknowledgeMyAppointment,
};
