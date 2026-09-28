const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { sendSMS, sendWhatsApp } = require('./smsService');
const { sendEmail } = require('./emailService');

const DEFAULT_STEPS = [
  {
    step: 1,
    delayHours: 2,
    channel: 'whatsapp',
    template: 'Dear {{firstName}}, thank you for worshiping with us at {{churchName}} today! We were truly blessed to have you in service. Pastor {{pastorName}} and the entire church family welcome you warmly. We pray that God meets you at your point of need. Have a glorious week!'
  },
  {
    step: 2,
    delayHours: 72,
    channel: 'sms',
    template: 'Hello {{firstName}}! Pastor {{pastorName}} and your {{churchName}} family are praying for you this week. If you have any prayer requests or need counseling, feel free to reply or visit us again this Sunday!'
  },
  {
    step: 3,
    delayHours: 144,
    channel: 'whatsapp',
    template: 'Happy weekend {{firstName}}! We are looking forward to having you with us again this Sunday at {{churchName}}. Join us for an inspiring time in God\'s presence. Service starts at 9:00 AM. See you there!'
  }
];

/**
 * Get or initialize church automated sequence configuration
 */
async function getOrCreateChurchSequence(churchId) {
  const { rows } = await query(
    'SELECT * FROM first_timer_sequences WHERE church_id = $1',
    [churchId]
  );
  if (rows[0]) return rows[0];

  const newId = uuidv4();
  const insertRes = await query(
    `INSERT INTO first_timer_sequences (id, church_id, title, is_active, steps)
     VALUES ($1, $2, 'Standard 3-Step Visitor Follow-Up', true, $3)
     RETURNING *`,
    [newId, churchId, JSON.stringify(DEFAULT_STEPS)]
  );
  return insertRes.rows[0];
}

/**
 * Update sequence configuration
 */
async function updateChurchSequence(churchId, { title, isActive, steps }) {
  const { rows } = await query(
    `INSERT INTO first_timer_sequences (id, church_id, title, is_active, steps, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (church_id) DO UPDATE
     SET title = COALESCE($3, first_timer_sequences.title),
         is_active = COALESCE($4, first_timer_sequences.is_active),
         steps = COALESCE($5, first_timer_sequences.steps),
         updated_at = NOW()
     RETURNING *`,
    [uuidv4(), churchId, title || 'Standard 3-Step Visitor Follow-Up', isActive !== false, JSON.stringify(steps || DEFAULT_STEPS)]
  );
  return rows[0];
}

/**
 * Replace placeholders in template
 */
function interpolateTemplate(template, vars) {
  let text = template || '';
  for (const [key, val] of Object.entries(vars)) {
    const reg = new RegExp(`{{${key}}}`, 'gi');
    text = text.replace(reg, val || '');
  }
  return text;
}

/**
 * Automatically enroll a first-timer in the church's automated sequence
 */
async function enrollFirstTimerInSequence({ churchId, firstTimer, churchName, pastorName }) {
  try {
    if (!firstTimer || (!firstTimer.phone && !firstTimer.email)) return;

    const sequence = await getOrCreateChurchSequence(churchId);
    if (!sequence || !sequence.is_active) return;

    const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
    if (!steps.length) return;

    const baseDate = firstTimer.visit_date ? new Date(firstTimer.visit_date) : new Date();
    const now = new Date();
    const effectiveBase = baseDate > now ? now : baseDate;

    const vars = {
      firstName: firstTimer.first_name || 'Friend',
      lastName: firstTimer.last_name || '',
      fullName: `${firstTimer.first_name || ''} ${firstTimer.last_name || ''}`.trim(),
      churchName: churchName || 'ChurchOS',
      pastorName: pastorName || 'the Pastoral Team',
    };

    for (const s of steps) {
      const delayHours = Number(s.delayHours) || 0;
      const scheduledFor = new Date(effectiveBase.getTime() + delayHours * 60 * 60 * 1000);
      const messageBody = interpolateTemplate(s.template, vars);

      await query(
        `INSERT INTO first_timer_sequence_queue (
          id, church_id, first_timer_id, step_number, channel,
          recipient_phone, recipient_email, message_body, scheduled_for, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')`,
        [
          uuidv4(),
          churchId,
          firstTimer.id,
          s.step || 1,
          s.channel || 'whatsapp',
          firstTimer.phone || null,
          firstTimer.email || null,
          messageBody,
          scheduledFor,
        ]
      );
    }

    logger.info('Enrolled first-timer in automated sequence', {
      firstTimerId: firstTimer.id,
      stepsCount: steps.length,
      churchId,
    });
  } catch (err) {
    logger.error('Failed to enroll first-timer in sequence', { error: err.message, firstTimerId: firstTimer?.id });
  }
}

/**
 * Get sequence queue items for a first timer
 */
async function getFirstTimerQueue(churchId, firstTimerId) {
  const { rows } = await query(
    `SELECT * FROM first_timer_sequence_queue
     WHERE church_id = $1 AND first_timer_id = $2
     ORDER BY step_number ASC`,
    [churchId, firstTimerId]
  );
  return rows;
}

/**
 * Cancel pending sequence steps for a first timer (e.g. after conversion)
 */
async function cancelFirstTimerSequence(churchId, firstTimerId) {
  const { rows } = await query(
    `UPDATE first_timer_sequence_queue
     SET status = 'cancelled'
     WHERE church_id = $1 AND first_timer_id = $2 AND status = 'scheduled'
     RETURNING *`,
    [churchId, firstTimerId]
  );
  return rows;
}

/**
 * Worker: Process due sequence queue items
 */
async function processDueSequenceQueue() {
  try {
    const { rows: dueItems } = await query(
      `SELECT q.*, c.name as church_name, c.settings as church_settings
       FROM first_timer_sequence_queue q
       JOIN churches c ON c.id = q.church_id
       WHERE q.status = 'scheduled' AND q.scheduled_for <= NOW()
       ORDER BY q.scheduled_for ASC
       LIMIT 50`
    );

    if (!dueItems.length) return;

    for (const item of dueItems) {
      try {
        const messagingCfg = item.church_settings?.messaging || {};

        if (item.channel === 'whatsapp' && item.recipient_phone) {
          await sendWhatsApp({
            to: item.recipient_phone,
            message: item.message_body,
            churchSettings: messagingCfg,
          });
        } else if (item.channel === 'sms' && item.recipient_phone) {
          await sendSMS({
            to: item.recipient_phone,
            message: item.message_body,
            churchSettings: messagingCfg,
          });
        } else if (item.channel === 'email' && item.recipient_email) {
          await sendEmail({
            to: item.recipient_email,
            subject: `Greetings from ${item.church_name}`,
            html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">${item.message_body.replace(/\n/g, '<br/>')}</div>`,
          }, messagingCfg);
        }

        await query(
          `UPDATE first_timer_sequence_queue
           SET status = 'sent', sent_at = NOW(), error_message = NULL
           WHERE id = $1`,
          [item.id]
        );
      } catch (err) {
        logger.warn('Failed to dispatch sequence message item', { queueId: item.id, error: err.message });
        await query(
          `UPDATE first_timer_sequence_queue
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          [err.message, item.id]
        );
      }
    }
  } catch (err) {
    logger.error('processDueSequenceQueue error', { error: err.message });
  }
}

module.exports = {
  DEFAULT_STEPS,
  getOrCreateChurchSequence,
  updateChurchSequence,
  enrollFirstTimerInSequence,
  getFirstTimerQueue,
  cancelFirstTimerSequence,
  processDueSequenceQueue,
};
