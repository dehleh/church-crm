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
 * Automatically checks and sends birthday greetings for members celebrating today.
 */
async function processAutomatedBirthdayGreetings() {
  try {
    const { rows: celebrants } = await query(
      `SELECT m.*, ch.name as church_name, ch.settings as church_settings
       FROM members m
       JOIN churches ch ON ch.id = m.church_id
       WHERE m.membership_status = 'active'
         AND m.date_of_birth IS NOT NULL
         AND EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
         AND (m.last_birthday_wish_year IS NULL OR m.last_birthday_wish_year < EXTRACT(YEAR FROM CURRENT_DATE)::int)
         AND (ch.settings->'features'->>'auto_birthday_wishes' IS NULL OR ch.settings->'features'->>'auto_birthday_wishes' = 'true')
       LIMIT 20`
    );

    for (const member of celebrants) {
      try {
        const churchSettings = member.church_settings?.messaging || {};
        const greeting = `Happy Birthday, ${member.first_name}! 🎂🎉\n\nThe leadership and entire family of ${member.church_name} celebrate God's amazing grace and goodness in your life today! May this new season bring divine health, peace, favor, and abundance in Jesus' name! Have a glorious celebration! ✨`;

        let sent = false;
        if (member.phone) {
          const waRes = await sendWhatsApp({ to: member.phone, body: greeting }, churchSettings);
          sent = waRes.success;
        }
        if (!sent && member.phone) {
          const smsRes = await sendSMS({ to: member.phone, body: greeting }, churchSettings);
          sent = smsRes.success;
        }
        if (member.email) {
          await sendEmail({
            to: member.email,
            subject: `Happy Birthday from ${member.church_name}! 🎂🎉`,
            html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
              <h2 style="color: #4f46e5;">Happy Birthday, ${member.first_name}! 🎂🎉</h2>
              <p>${greeting.replace(/\n/g, '<br/>')}</p>
              <p style="margin-top: 25px; font-weight: bold;">With love and prayers,<br/>${member.church_name}</p>
            </div>`,
          });
          sent = true;
        }

        await query('UPDATE members SET last_birthday_wish_year = EXTRACT(YEAR FROM CURRENT_DATE) WHERE id = $1', [member.id]);
        logger.info('Automated birthday greeting dispatched', { memberId: member.id, name: `${member.first_name} ${member.last_name}` });
      } catch (memErr) {
        logger.error('Error sending automated birthday greeting', { memberId: member.id, error: memErr.message });
      }
    }
  } catch (err) {
    logger.error('Error processing automated birthday greetings', { error: err.message });
  }
}

/**
 * Checks and dispatches automated daily morning/night devotional reminders to members.
 */
async function processAutomatedDevotionalReminders() {
  try {
    const now = new Date();
    const currentHour = now.getHours(); // 0 to 23

    // Determine current window: 'morning' (6-8am) or 'night' (20-22pm)
    const isMorning = currentHour >= 6 && currentHour <= 8;
    const isNight = currentHour >= 20 && currentHour <= 22;

    if (!isMorning && !isNight) return;

    // Find churches with active devotional reminders and today's published devotional
    const { rows: churches } = await query(
      `SELECT c.id, c.name, c.settings,
              d.id as devotional_id, d.title, d.theme_scripture, d.scripture_text,
              d.content, d.confession, d.prayer_point, d.bible_reading_plan,
              d.reminder_sent_at
       FROM churches c
       JOIN daily_devotionals d ON d.church_id = c.id AND d.date = CURRENT_DATE AND d.is_published = true
       WHERE (c.settings->'devotional_reminders'->>'enabled')::boolean = true
         AND (d.reminder_sent_at IS NULL OR d.reminder_sent_at::date < CURRENT_DATE)
       LIMIT 10`
    );

    for (const church of churches) {
      const devConfig = church.settings?.devotional_reminders || {};
      const schedule = devConfig.schedule || 'morning'; // 'morning', 'night', 'both'

      const shouldTrigger =
        (schedule === 'morning' && isMorning) ||
        (schedule === 'night' && isNight) ||
        (schedule === 'both' && (isMorning || isNight));

      if (!shouldTrigger) continue;

      logger.info('Dispatching automated devotional broadcast', {
        churchId: church.id,
        churchName: church.name,
        devotionalTitle: church.title,
        slot: isMorning ? 'morning' : 'night'
      });

      const { rows: members } = await query(
        `SELECT first_name, last_name, email, phone
         FROM members
         WHERE church_id = $1 AND membership_status = 'active' AND (phone IS NOT NULL OR email IS NOT NULL)
         LIMIT 200`,
        [church.id]
      );

      const churchMessaging = church.settings?.messaging || {};
      const channels = devConfig.channels || ['whatsapp'];

      const broadcastMsg = `📖 *${church.name} Daily Devotional*\n*${church.title}*\n\n` +
        `📜 *Scripture:* ${church.theme_scripture}\n` +
        (church.scripture_text ? `_"${church.scripture_text}"_\n\n` : '\n') +
        `${church.content.slice(0, 450)}...\n\n` +
        (church.confession ? `✨ *Declaration:* ${church.confession}\n\n` : '') +
        (church.prayer_point ? `🙏 *Prayer Point:* ${church.prayer_point}\n\n` : '') +
        (church.bible_reading_plan ? `📚 *Today's Bible Reading:* ${church.bible_reading_plan}\n\n` : '') +
        `May God's presence and peace guide your day! ✨`;

      for (const m of members) {
        if (channels.includes('whatsapp') && m.phone) {
          await sendWhatsApp({ to: m.phone, body: broadcastMsg }, churchMessaging);
        } else if (channels.includes('email') && m.email) {
          await sendEmail({
            to: m.email,
            subject: `Daily Devotional: ${church.title} - ${church.name}`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; line-height: 1.6;">
              <h2 style="color: #4f46e5;">${church.title}</h2>
              <p><strong>Scripture:</strong> ${church.theme_scripture}</p>
              ${church.scripture_text ? `<blockquote style="background: #f3f4f6; padding: 12px; border-left: 4px solid #4f46e5;"><em>"${church.scripture_text}"</em></blockquote>` : ''}
              <div>${church.content.replace(/\n/g, '<br/>')}</div>
              ${church.confession ? `<p><strong>Faith Declaration:</strong> ${church.confession}</p>` : ''}
              ${church.prayer_point ? `<p><strong>Prayer Point:</strong> ${church.prayer_point}</p>` : ''}
              ${church.bible_reading_plan ? `<p><strong>Bible Reading:</strong> ${church.bible_reading_plan}</p>` : ''}
            </div>`
          }, churchMessaging);
        }
      }

      await query(
        `UPDATE daily_devotionals SET reminder_sent_at = NOW() WHERE id = $1`,
        [church.devotional_id]
      );
    }
  } catch (err) {
    logger.error('Error processing automated devotional reminders', { error: err.message });
  }
}

/**
 * Automatically checks expiring and expired church subscriptions.
 * Dispatches Day 3, Day 1, and Expiration reminder emails to church admins.
 */
async function processSubscriptionTrialReminders() {
  try {
    // 1. Mark overdue accounts as expired (if not whitelisted and not already marked expired)
    await query(`
      UPDATE churches
      SET subscription_status = 'expired'
      WHERE subscription_expires_at < NOW()
        AND is_whitelisted = false
        AND subscription_status != 'expired'
    `);

    // 2. Find trial churches needing reminder notices
    const { rows: churches } = await query(`
      SELECT c.id, c.name, c.slug, c.subscription_plan, c.subscription_expires_at,
             c.settings,
             u.email AS admin_email, u.first_name AS admin_name
      FROM churches c
      LEFT JOIN LATERAL (
        SELECT email, first_name
        FROM users
        WHERE church_id = c.id AND role = 'admin' AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      ) u ON true
      WHERE c.is_whitelisted = false
        AND c.subscription_expires_at IS NOT NULL
        AND c.is_active = true
        AND (c.subscription_plan = 'trial' OR c.subscription_plan LIKE 'trial_%')
        AND u.email IS NOT NULL
      LIMIT 20
    `);

    const now = new Date();

    for (const church of churches) {
      const exp = new Date(church.subscription_expires_at);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const remindersSent = church.settings?.subscription_reminders || {};

      let reminderType = null;
      if (diffDays === 3 && !remindersSent.day_3) {
        reminderType = 'day_3';
      } else if (diffDays === 1 && !remindersSent.day_1) {
        reminderType = 'day_1';
      } else if (diffDays <= 0 && !remindersSent.expired) {
        reminderType = 'expired';
      }

      if (!reminderType) continue;

      const churchSettings = church.settings?.messaging || {};
      const loginUrl = `${process.env.APP_URL || 'https://cos.themobilemissionary.org'}/settings?tab=subscription`;

      let subject = '';
      let emailHtml = '';

      if (reminderType === 'day_3' || reminderType === 'day_1') {
        const daysText = reminderType === 'day_3' ? '3 days' : '24 hours';
        subject = `⚠️ Your ChurchOS free trial ends in ${daysText} — ${church.name}`;
        emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 20px; font-weight: bold; color: #4338ca;">⛪ ChurchOS</span>
            </div>
            <h2 style="color: #111827; margin-top: 0;">Your free trial ends in ${daysText}</h2>
            <p>Dear ${church.admin_name || 'Pastor / Administrator'},</p>
            <p>We hope ChurchOS has been a blessing to <strong>${church.name}</strong> over the past two weeks.</p>
            <p>Your 14-day trial period is ending in <strong>${daysText}</strong>. To keep uninterrupted access to your member directory, service check-ins, financial records, and church branches, please choose a subscription plan:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>• Starter Plan:</strong> ₦250,000 / year (Single Campus HQ — Billed Annually)</p>
              <p style="margin: 0;"><strong>• Growth Plan:</strong> ₦600,000 / year (Up to 3 Campuses & Branches — Billed Annually)</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #4338ca; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Subscribe with Paystack →
              </a>
            </div>
            <p style="font-size: 12px; color: #6b7280;">If you have any questions or need Denominational / Enterprise support, reply to this email or contact hello@themobilemissionary.org.</p>
          </div>
        `;
      } else if (reminderType === 'expired') {
        subject = `Your ChurchOS trial has expired — Reactivate ${church.name}`;
        emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 20px; font-weight: bold; color: #4338ca;">⛪ ChurchOS</span>
            </div>
            <h2 style="color: #b91c1c; margin-top: 0;">Trial Concluded</h2>
            <p>Dear ${church.admin_name || 'Pastor / Administrator'},</p>
            <p>Your 14-day free trial for <strong>${church.name}</strong> has now expired. Your church records and member data remain safely saved in our database.</p>
            <p>To reactivate full access for your pastoral team and ministerial staff, please subscribe to an active plan:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #059669; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reactivate Subscription Now →
              </a>
            </div>
            <p style="font-size: 12px; color: #6b7280;">Thank you for partnering with ChurchOS.</p>
          </div>
        `;
      }

      await sendEmail({
        to: church.admin_email,
        subject,
        html: emailHtml,
      }, churchSettings);

      // Record reminder milestone in church settings
      const updatedReminders = { ...remindersSent, [reminderType]: now.toISOString() };
      await query(
        `UPDATE churches
         SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{subscription_reminders}', $1::jsonb)
         WHERE id = $2`,
        [JSON.stringify(updatedReminders), church.id]
      );

      logger.info('Dispatched automated subscription trial reminder', {
        churchId: church.id,
        churchName: church.name,
        reminderType,
        recipient: church.admin_email,
      });
    }
  } catch (err) {
    logger.error('Error in subscription trial reminder job', { error: err.message });
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
    await processAutomatedBirthdayGreetings();
    await processAutomatedDevotionalReminders();
    await processSubscriptionTrialReminders();
  } catch (err) {
    logger.error('Scheduler tick error', { error: err.message });
  } finally {
    isProcessing = false;
  }
}

function initScheduler(intervalMs = 60000) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  logger.info('Automated broadcast, event & subscription reminder scheduler started (60s tick)');
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
  processAutomatedBirthdayGreetings,
  processAutomatedDevotionalReminders,
  processSubscriptionTrialReminders,
};


