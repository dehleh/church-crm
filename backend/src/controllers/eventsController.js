const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');
const { sendSMS, sendWhatsApp } = require('../services/smsService');

// GET /api/events
const getEvents = async (req, res) => {
  const { page = 1, limit = 20, status, type, upcoming, branchId, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['e.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx} OR e.location ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }
    if (type) { conditions.push(`e.event_type = $${idx++}`); params.push(type); }
    if (req.branchId) {
      conditions.push(`(e.branch_id = $${idx} OR e.branch_id IS NULL)`);
      params.push(req.branchId); idx++;
    } else if (branchId) {
      conditions.push(`e.branch_id = $${idx++}`);
      params.push(branchId);
    }
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
    logger.error('getEvents failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/events
const createEvent = async (req, res) => {
  const {
    title, description, eventType, startDatetime, startDate, endDatetime, endDate,
    location, isOnline, onlineLink, expectedAttendance, branchId,
    bannerUrl, reminderEnabled, reminderTimeBefore, reminderChannels, reminderTarget, reminderCustomText
  } = req.body;

  const finalStart = startDatetime || startDate;
  const finalEnd = endDatetime || endDate || null;
  const finalBranch = req.branchId || branchId || null;

  try {
    const { rows } = await query(
      `INSERT INTO events (
        id, church_id, branch_id, title, description, event_type,
        start_datetime, end_datetime, location, is_online, online_link,
        expected_attendance, created_by,
        banner_url, reminder_enabled, reminder_time_before, reminder_channels, reminder_target, reminder_custom_text
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        uuidv4(), req.churchId, finalBranch, title, description || null, eventType || null,
        finalStart, finalEnd, location || null,
        isOnline || false, onlineLink || null, expectedAttendance || null, req.user.id,
        bannerUrl || null,
        reminderEnabled === true || reminderEnabled === 'true',
        reminderTimeBefore || '24h',
        Array.isArray(reminderChannels) ? reminderChannels : (reminderChannels ? [reminderChannels] : ['whatsapp']),
        reminderTarget || 'all_members',
        reminderCustomText || null
      ]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createEvent failed', { error: err.message });
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

// PUT /api/events/:id
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, eventType, startDatetime, startDate, endDatetime, endDate,
    location, isOnline, onlineLink, expectedAttendance, branchId, status,
    bannerUrl, reminderEnabled, reminderTimeBefore, reminderChannels, reminderTarget, reminderCustomText
  } = req.body;

  try {
    const check = await query('SELECT * FROM events WHERE id = $1 AND church_id = $2', [id, req.churchId]);
    if (!check.rows[0]) return res.status(404).json({ success: false, message: 'Event not found' });

    const finalStart = startDatetime || startDate || check.rows[0].start_datetime;
    const finalEnd = endDatetime !== undefined ? endDatetime : (endDate !== undefined ? endDate : check.rows[0].end_datetime);
    const finalBranch = req.branchId || (branchId !== undefined ? branchId : check.rows[0].branch_id);

    const { rows } = await query(
      `UPDATE events SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        event_type = COALESCE($4, event_type),
        start_datetime = $5,
        end_datetime = $6,
        location = COALESCE($7, location),
        is_online = COALESCE($8, is_online),
        online_link = COALESCE($9, online_link),
        expected_attendance = COALESCE($10, expected_attendance),
        branch_id = $11,
        status = COALESCE($12, status),
        banner_url = COALESCE($13, banner_url),
        reminder_enabled = COALESCE($14, reminder_enabled),
        reminder_time_before = COALESCE($15, reminder_time_before),
        reminder_channels = COALESCE($16, reminder_channels),
        reminder_target = COALESCE($17, reminder_target),
        reminder_custom_text = COALESCE($18, reminder_custom_text),
        updated_at = NOW()
       WHERE id = $1 AND church_id = $19
       RETURNING *`,
      [
        id, title, description, eventType, finalStart, finalEnd, location,
        isOnline, onlineLink, expectedAttendance, finalBranch, status,
        bannerUrl,
        reminderEnabled !== undefined ? (reminderEnabled === true || reminderEnabled === 'true') : null,
        reminderTimeBefore,
        reminderChannels ? (Array.isArray(reminderChannels) ? reminderChannels : [reminderChannels]) : null,
        reminderTarget,
        reminderCustomText,
        req.churchId
      ]
    );

    return res.json({ success: true, data: rows[0], message: 'Event updated' });
  } catch (err) {
    logger.error('updateEvent error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM events WHERE id = $1 AND church_id = $2', [id, req.churchId]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Event not found' });
    return res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    logger.error('deleteEvent error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/events/:id/remind — manual trigger of event reminder
const triggerEventReminder = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: evtRows } = await query(
      `SELECT e.*, c.name as church_name, c.settings as church_settings
       FROM events e
       JOIN churches c ON c.id = e.church_id
       WHERE e.id = $1 AND e.church_id = $2`,
      [id, req.churchId]
    );
    if (!evtRows[0]) return res.status(404).json({ success: false, message: 'Event not found' });

    const event = evtRows[0];
    const churchSettings = event.church_settings?.messaging || {};

    let memberQuery = '';
    let memberParams = [req.churchId];

    if (event.reminder_target === 'attendees') {
      memberQuery = `
        SELECT DISTINCT m.first_name, m.last_name, m.phone, m.email
        FROM attendance a
        JOIN members m ON m.id = a.member_id
        WHERE a.event_id = $2 AND m.church_id = $1 AND m.membership_status = 'active'
      `;
      memberParams.push(event.id);
    } else if (event.reminder_target === 'branch' && event.branch_id) {
      memberQuery = `
        SELECT first_name, last_name, phone, email
        FROM members
        WHERE church_id = $1 AND branch_id = $2 AND membership_status = 'active'
      `;
      memberParams.push(event.branch_id);
    } else {
      memberQuery = `
        SELECT first_name, last_name, phone, email
        FROM members
        WHERE church_id = $1 AND membership_status = 'active'
      `;
    }

    const { rows: members } = await query(memberQuery, memberParams);

    if (!members.length) {
      return res.status(400).json({ success: false, message: 'No recipients found for this event reminder target' });
    }

    const eventDate = new Date(event.start_datetime);
    const eventDateStr = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    const eventTimeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const channels = event.reminder_channels || ['whatsapp'];

    if (channels.includes('whatsapp')) {
      const phones = members.map(m => m.phone).filter(Boolean);
      const customMsg = event.reminder_custom_text ? `\n\n${event.reminder_custom_text}` : '';
      const onlineInfo = event.is_online && event.online_link ? `\n🔗 *Join Online:* ${event.online_link}` : '';
      const locationInfo = event.location ? `\n📍 *Venue:* ${event.location}` : '';
      const body = `*REMINDER: ${event.title}*\n\nDear member, this is a friendly reminder that *${event.title}* holds:\n🗓 *Date:* ${eventDateStr}\n⏰ *Time:* ${eventTimeStr}${locationInfo}${onlineInfo}${customMsg}\n\nWe look forward to having you! Blessings,\n*${event.church_name}*`;

      if (phones.length) {
        await sendWhatsApp({
          to: phones,
          body,
          mediaUrl: event.banner_url || null,
        }, churchSettings);
      }
    }

    if (channels.includes('email')) {
      const emails = members.map(m => m.email).filter(Boolean);
      if (emails.length) {
        const customMsgHtml = event.reminder_custom_text ? `<p style="font-size:15px;color:#374151;margin:16px 0;">${event.reminder_custom_text}</p>` : '';
        const bannerHtml = event.banner_url ? `<img src="${event.banner_url}" alt="${event.title}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin-bottom:20px;" />` : '';
        await sendEmail({
          to: emails,
          subject: `Reminder: ${event.title} - ${eventDateStr}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
              ${bannerHtml}
              <h2 style="color:#1e3a8a;margin-top:0;">Reminder: ${event.title}</h2>
              <p style="font-size:15px;color:#4b5563;">You are warmly invited to join us for <strong>${event.title}</strong>.</p>
              <div style="background:#f3f4f6;padding:16px;border-radius:12px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Date:</strong> ${eventDateStr}</p>
                <p style="margin:4px 0;"><strong>Time:</strong> ${eventTimeStr}</p>
                ${event.location ? `<p style="margin:4px 0;"><strong>Location:</strong> ${event.location}</p>` : ''}
                ${event.online_link ? `<p style="margin:4px 0;"><strong>Online Link:</strong> <a href="${event.online_link}">${event.online_link}</a></p>` : ''}
              </div>
              ${customMsgHtml}
              <p style="font-size:13px;color:#9ca3af;margin-top:24px;">Sent by ${event.church_name} via ChurchOS</p>
            </div>
          `,
        }, churchSettings);
      }
    }

    if (channels.includes('sms')) {
      const phones = members.map(m => m.phone).filter(Boolean);
      const shortText = `${event.title} holds ${eventDateStr} at ${eventTimeStr} at ${event.location || 'Church'}. See you there! - ${event.church_name}`;
      if (phones.length) {
        await sendSMS({ to: phones, body: shortText }, churchSettings);
      }
    }

    await query('UPDATE events SET reminder_sent_at = NOW() WHERE id = $1', [event.id]);

    return res.json({
      success: true,
      message: `Event reminder dispatched to ${members.length} recipients via ${channels.join(', ')}`,
      recipientsCount: members.length,
    });
  } catch (err) {
    logger.error('triggerEventReminder failed', { error: err.message });
    return res.status(500).json({ success: false, message: `Failed to dispatch reminder: ${err.message}` });
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  triggerEventReminder,
  recordAttendance,
  getEventAttendance,
  getEventStats,
};
