const { query } = require('../config/database');
const { sendEmail } = require('./emailService');
const { sendSMS, sendWhatsApp } = require('./smsService');
const logger = require('../config/logger');
const sanitizeHtml = require('sanitize-html');

let schedulerTimer = null;
let isProcessing = false;

// Helper: resolve audience for communications
const { resolveAudience } = require('../controllers/communicationsController');

/**
 * Checks and dispatches scheduled communications whose scheduled_at has arrived.
 */
async function processScheduledCommunications() {
  try {
    const { rows: dueComms } = await query(
      `SELECT c.*, ch.settings as church_settings, ch.name as church_name
       FROM communications c
       JOIN churches ch ON ch.id = c.church_id
       WHERE c.status IN ('scheduled', 'draft')
         AND c.scheduled_at IS NOT NULL
         AND c.scheduled_at <= NOW()
       LIMIT 10`
    );

    for (const comm of dueComms) {
      logger.info('Processing scheduled communication', { id: comm.id, title: comm.title, channel: comm.channel });
      const churchSettings = comm.church_settings?.messaging || {};
      const recipients = await resolveAudience(comm.church_id, comm.audience, comm.audience_filter || {});

      if (!recipients.length) {
        await query(
          `UPDATE communications SET status='sent', sent_at=NOW(), sent_count=0, notes='No recipients found for audience'
           WHERE id=$1`,
          [comm.id]
        );
        continue;
      }

      try {
        if (comm.channel === 'whatsapp') {
          const phones = recipients.map(r => r.phone).filter(Boolean);
          if (phones.length) {
            await sendWhatsApp({
              to: phones,
              body: `*${comm.title}*\n\n${comm.body}`,
              mediaUrl: comm.image_url || null,
            }, churchSettings);
          }
        } else if (comm.channel === 'email') {
          const emails = recipients.map(r => r.email).filter(Boolean);
          const safeHtml = sanitizeHtml(comm.body, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
            allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
          });
          if (emails.length) {
            await sendEmail({
              to: emails,
              subject: comm.title,
              html: safeHtml,
            }, churchSettings);
          }
        } else if (comm.channel === 'sms') {
          const phones = recipients.map(r => r.phone).filter(Boolean);
          if (phones.length) {
            await sendSMS({ to: phones, body: `${comm.title}\n\n${comm.body}` }, churchSettings);
          }
        }

        await query(
          `UPDATE communications SET status='sent', sent_at=NOW(), sent_count=$1 WHERE id=$2`,
          [recipients.length, comm.id]
        );
        logger.info('Scheduled communication dispatched successfully', { id: comm.id, sentCount: recipients.length });
      } catch (dispatchErr) {
        logger.error('Failed to dispatch scheduled communication', { id: comm.id, error: dispatchErr.message });
        await query(
          `UPDATE communications SET status='failed', notes=$1 WHERE id=$2`,
          [dispatchErr.message, comm.id]
        );
      }
    }
  } catch (err) {
    logger.error('Error processing scheduled communications', { error: err.message });
  }
}

/**
 * Checks and dispatches automated event and service reminders.
 */
async function processAutomatedEventReminders() {
  try {
    const { rows: dueEvents } = await query(
      `SELECT e.*, c.name as church_name, c.settings as church_settings
       FROM events e
       JOIN churches c ON c.id = e.church_id
       WHERE e.reminder_enabled = true
         AND e.reminder_sent_at IS NULL
         AND e.start_datetime > NOW()
         AND (e.status IS NULL OR e.status != 'cancelled')
       LIMIT 10`
    );

    const now = new Date();

    for (const event of dueEvents) {
      const eventTime = new Date(event.start_datetime);
      const diffMs = eventTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let isDue = false;
      const timing = event.reminder_time_before || '24h';

      if (timing === '24h' && diffHours <= 24 && diffHours > 0) {
        isDue = true;
      } else if (timing === '2h' && diffHours <= 2 && diffHours > 0) {
        isDue = true;
      } else if (timing === '1h' && diffHours <= 1 && diffHours > 0) {
        isDue = true;
      } else if (timing === 'morning_of') {
        const isSameDay = now.toDateString() === eventTime.toDateString();
        const currentHour = now.getHours();
        if (isSameDay && currentHour >= 7) {
          isDue = true;
        }
      }

      if (!isDue) continue;

      logger.info('Event reminder triggered', { eventId: event.id, title: event.title, timing });

      // Gather recipients: all active members in church or branch
      let memberQuery = `SELECT first_name, last_name, email, phone FROM members WHERE church_id = $1 AND membership_status = 'active'`;
      const memberParams = [event.church_id];
      if (event.branch_id && event.reminder_target === 'branch') {
        memberQuery += ' AND branch_id = $2';
        memberParams.push(event.branch_id);
      }

      const { rows: members } = await query(memberQuery, memberParams);
      if (!members.length) {
        await query('UPDATE events SET reminder_sent_at = NOW() WHERE id = $1', [event.id]);
        continue;
      }

      const churchSettings = event.church_settings?.messaging || {};
      const channels = event.reminder_channels || ['whatsapp'];

      const eventDateStr = eventTime.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      const eventTimeStr = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const reminderBody =
        `🔔 *REMINDER: ${event.title}*\n\n` +
        `Dear Member, we look forward to having you at *${event.church_name}* for:\n\n` +
        `📅 *Date:* ${eventDateStr}\n` +
        `⏰ *Time:* ${eventTimeStr}\n` +
        `📍 *Venue:* ${event.location || (event.is_online ? 'Online' : 'Main Church Auditorium')}\n` +
        (event.online_link ? `🔗 *Join Online:* ${event.online_link}\n` : '') +
        (event.reminder_custom_text ? `\n_${event.reminder_custom_text}_\n` : '') +
        `\nGod bless you! See you there. 🙏`;

      try {
        if (channels.includes('whatsapp')) {
          const phones = members.map(m => m.phone).filter(Boolean);
          if (phones.length) {
            await sendWhatsApp({
              to: phones,
              body: reminderBody,
              mediaUrl: event.banner_url || null,
            }, churchSettings);
          }
        }

        if (channels.includes('email')) {
          const emails = members.map(m => m.email).filter(Boolean);
          if (emails.length) {
            await sendEmail({
              to: emails,
              subject: `Reminder: ${event.title} — ${event.church_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
                  ${event.banner_url ? `<img src="${event.banner_url}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;" alt="Banner" />` : ''}
                  <h2 style="color: #1e3a8a; margin-top: 0;">${event.title}</h2>
                  <p>Dear Member,</p>
                  <p>This is a reminder that <strong>${event.title}</strong> is holding soon!</p>
                  <div style="background-color: #f3f4f6; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Date:</strong> ${eventDateStr}</p>
                    <p style="margin: 4px 0;"><strong>Time:</strong> ${eventTimeStr}</p>
                    <p style="margin: 4px 0;"><strong>Venue:</strong> ${event.location || (event.is_online ? 'Online' : 'Main Sanctuary')}</p>
                    ${event.online_link ? `<p style="margin: 4px 0;"><strong>Link:</strong> <a href="${event.online_link}">${event.online_link}</a></p>` : ''}
                  </div>
                  ${event.reminder_custom_text ? `<p><em>${event.reminder_custom_text}</em></p>` : ''}
                  <p>We look forward to fellowship with you!</p>
                  <p style="color: #6b7280; font-size: 12px;">${event.church_name}</p>
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
        logger.info('Event reminders sent successfully', { eventId: event.id, membersCount: members.length });
      } catch (err) {
        logger.error('Failed to send event reminder', { eventId: event.id, error: err.message });
      }
    }
  } catch (err) {
    logger.error('Error processing automated event reminders', { error: err.message });
  }
}

/**
 * Main scheduler loop.
 */
async function runSchedulerTick() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    await processScheduledCommunications();
    await processAutomatedEventReminders();
  } catch (err) {
    logger.error('Scheduler tick error', { error: err.message });
  } finally {
    isProcessing = false;
  }
}

function initScheduler(intervalMs = 60000) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  logger.info('Automated broadcast & event reminder scheduler started (60s tick)');
  schedulerTimer = setInterval(runSchedulerTick, intervalMs);
  // Run first tick after 5 seconds
  setTimeout(runSchedulerTick, 5000);
}

function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

module.exports = {
  initScheduler,
  stopScheduler,
  runSchedulerTick,
  processScheduledCommunications,
  processAutomatedEventReminders,
};
