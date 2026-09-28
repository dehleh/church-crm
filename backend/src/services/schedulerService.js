const { query } = require('../config/database');
const { sendEmail } = require('./emailService');
const { sendSMS, sendWhatsApp } = require('./smsService');
const pushNotificationService = require('./pushNotificationService');
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
 * Checks and dispatches automated daily morning/night devotional reminders and Web Push to members.
 */
async function processAutomatedDevotionalReminders() {
  try {
    const now = new Date();
    const currentHour = now.getHours(); // 0 to 23

    // Determine current window: 'morning' (5-11am) or 'night' (20-23pm)
    const isMorning = currentHour >= 5 && currentHour <= 11;
    const isNight = currentHour >= 20 && currentHour <= 23;

    // Find churches with today's published devotional that need Web Push or email broadcast
    const { rows: devotionals } = await query(
      `SELECT d.id as devotional_id, d.title, d.theme_scripture, d.scripture_text,
              d.content, d.confession, d.prayer_point, d.bible_reading_plan,
              d.morning_pushed_at, d.morning_emailed_at, d.reminder_sent_at,
              c.id as church_id, c.name as church_name, c.slug as church_slug, c.settings as church_settings
       FROM daily_devotionals d
       JOIN churches c ON c.id = d.church_id
       WHERE d.date = CURRENT_DATE AND d.is_published = true
         AND (
           d.morning_pushed_at IS NULL 
           OR (d.morning_emailed_at IS NULL AND $1 = true)
           OR ((c.settings->'devotional_reminders'->>'enabled')::boolean = true AND d.reminder_sent_at IS NULL)
         )
       LIMIT 15`,
      [isMorning]
    );

    for (const dev of devotionals) {
      const churchSettings = dev.church_settings || {};
      const devConfig = churchSettings.devotional_reminders || {};

      // 1. AUTOMATIC PHONE POP-UP (Web Push)
      if (!dev.morning_pushed_at) {
        try {
          const pushPayload = {
            title: `📖 ${dev.title}`,
            body: `${dev.theme_scripture ? dev.theme_scripture + ' · ' : ''}${dev.scripture_text ? '"' + dev.scripture_text.slice(0, 100) + '..."' : (dev.content || '').slice(0, 110) + '...'} Tap to read today's word.`,
            icon: '/logo.png',
            badge: '/favicon.png',
            url: `/portal/${dev.church_slug || ''}/devotionals/today`,
            tag: `devotional-${dev.devotional_id}`,
            data: { url: `/portal/${dev.church_slug || ''}/devotionals/today` },
            actions: [
              { action: 'read', title: '📖 Read Now' },
            ],
          };

          const pushResult = await pushNotificationService.sendPushToChurch(dev.church_id, pushPayload, { topic: 'devotionals' });
          logger.info('Dispatched daily devotional phone push pop-up', {
            churchId: dev.church_id,
            devotionalId: dev.devotional_id,
            sentCount: pushResult.sent,
          });

          await query(`UPDATE daily_devotionals SET morning_pushed_at = NOW() WHERE id = $1`, [dev.devotional_id]);
        } catch (pushErr) {
          logger.error('Error dispatching devotional web push', { devotionalId: dev.devotional_id, error: pushErr.message });
        }
      }

      // 2. AUTOMATIC EMAIL TO SUBSCRIBED MEMBERS
      if (!dev.morning_emailed_at && isMorning) {
        try {
          // Fetch active members who have not opted out of devotional emails
          const { rows: emailMembers } = await query(
            `SELECT m.id, m.first_name, m.last_name, m.email
             FROM members m
             LEFT JOIN member_notification_preferences mnp ON mnp.member_id = m.id AND mnp.church_id = m.church_id
             WHERE m.church_id = $1 
               AND m.membership_status = 'active' 
               AND m.email IS NOT NULL AND m.email != ''
               AND (mnp.email_enabled IS NULL OR mnp.email_enabled = true)
               AND (mnp.notify_devotionals IS NULL OR mnp.notify_devotionals = true)
             LIMIT 500`,
            [dev.church_id]
          );

          if (emailMembers.length > 0) {
            const portalUrl = `${process.env.APP_URL || 'https://cos.themobilemissionary.org'}/portal/${dev.church_slug || ''}/devotionals/today`;
            const churchMessaging = churchSettings.messaging || {};

            const emailHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #4f46e5; background: #eef2ff; padding: 4px 12px; border-radius: 9999px;">Daily Devotional</span>
                  <h1 style="color: #0f172a; margin-top: 14px; margin-bottom: 6px; font-size: 24px; font-weight: 800;">${dev.title}</h1>
                  <p style="color: #64748b; font-size: 14px; margin: 0;">${dev.church_name} · ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>

                <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                  <p style="font-size: 13px; font-weight: 700; color: #4f46e5; text-transform: uppercase; margin: 0 0 6px 0;">Theme Scripture: ${dev.theme_scripture}</p>
                  ${dev.scripture_text ? `<p style="font-size: 16px; font-style: italic; color: #334155; margin: 0; line-height: 1.5;">"${dev.scripture_text}"</p>` : ''}
                </div>

                <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
                  ${dev.content.replace(/\n/g, '<br/>')}
                </div>

                ${dev.confession ? `
                  <div style="background: #fefce8; border: 1px solid #fef08a; padding: 14px 18px; border-radius: 8px; margin-bottom: 16px;">
                    <strong style="color: #854d0e; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 4px;">✨ Faith Declaration</strong>
                    <span style="color: #713f12; font-size: 14px;">${dev.confession}</span>
                  </div>
                ` : ''}

                ${dev.prayer_point ? `
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 8px; margin-bottom: 16px;">
                    <strong style="color: #166534; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 4px;">🙏 Today's Prayer Point</strong>
                    <span style="color: #14532d; font-size: 14px;">${dev.prayer_point}</span>
                  </div>
                ` : ''}

                ${dev.bible_reading_plan ? `
                  <div style="background: #f1f5f9; padding: 12px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; color: #475569;">
                    📚 <strong>Today's Bible Reading:</strong> ${dev.bible_reading_plan}
                  </div>
                ` : ''}

                <div style="text-align: center; margin: 28px 0;">
                  <a href="${portalUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open in Member Portal</a>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                  You are receiving this because you are an active member of ${dev.church_name}.
                  Manage your notification preferences anytime in your Member Profile.
                </p>
              </div>
            `;

            for (const member of emailMembers) {
              await sendEmail({
                to: member.email,
                subject: `📖 ${dev.title} — Today's Devotional`,
                html: emailHtml,
              }, churchMessaging).catch(err => {
                logger.warn('Failed to send devotional email to member', { email: member.email, error: err.message });
              });
            }

            logger.info('Dispatched daily devotional email broadcast', {
              churchId: dev.church_id,
              devotionalId: dev.devotional_id,
              recipients: emailMembers.length,
            });
          }

          await query(`UPDATE daily_devotionals SET morning_emailed_at = NOW() WHERE id = $1`, [dev.devotional_id]);
        } catch (emailErr) {
          logger.error('Error dispatching devotional emails', { devotionalId: dev.devotional_id, error: emailErr.message });
        }
      }

      // 3. OPTIONAL WHATSAPP BROADCAST (If enabled in church settings)
      if (devConfig.enabled && !dev.reminder_sent_at) {
        const schedule = devConfig.schedule || 'morning';
        const shouldTrigger =
          (schedule === 'morning' && isMorning) ||
          (schedule === 'night' && isNight) ||
          (schedule === 'both' && (isMorning || isNight));

        if (shouldTrigger && (devConfig.channels || []).includes('whatsapp')) {
          try {
            const { rows: waMembers } = await query(
              `SELECT m.phone FROM members m
               LEFT JOIN member_notification_preferences mnp ON mnp.member_id = m.id AND mnp.church_id = m.church_id
               WHERE m.church_id = $1 AND m.membership_status = 'active' AND m.phone IS NOT NULL
                 AND (mnp.whatsapp_enabled IS NULL OR mnp.whatsapp_enabled = true)
                 AND (mnp.notify_devotionals IS NULL OR mnp.notify_devotionals = true)
               LIMIT 200`,
              [dev.church_id]
            );

            const broadcastMsg = `📖 *${dev.church_name} Daily Devotional*\n*${dev.title}*\n\n` +
              `📜 *Scripture:* ${dev.theme_scripture}\n` +
              (dev.scripture_text ? `_"${dev.scripture_text}"_\n\n` : '\n') +
              `${(dev.content || '').slice(0, 450)}...\n\n` +
              (dev.confession ? `✨ *Declaration:* ${dev.confession}\n\n` : '') +
              (dev.prayer_point ? `🙏 *Prayer Point:* ${dev.prayer_point}\n\n` : '') +
              (dev.bible_reading_plan ? `📚 *Today's Bible Reading:* ${dev.bible_reading_plan}\n\n` : '') +
              `May God's presence and peace guide your day! ✨`;

            const churchMessaging = churchSettings.messaging || {};
            for (const m of waMembers) {
              await sendWhatsApp({ to: m.phone, body: broadcastMsg }, churchMessaging).catch(() => {});
            }

            await query(`UPDATE daily_devotionals SET reminder_sent_at = NOW() WHERE id = $1`, [dev.devotional_id]);
          } catch (waErr) {
            logger.error('Error dispatching devotional WhatsApp broadcast', { error: waErr.message });
          }
        }
      }
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
    try {
      const { processDueSequenceQueue } = require('./firstTimerSequenceService');
      await processDueSequenceQueue();
    } catch (seqErr) {
      logger.warn('Error in first-timer sequence queue job', { error: seqErr.message });
    }
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


