const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { sendWhatsApp, sendSMS } = require('../services/smsService');
const { sendEmail } = require('../services/emailService');

// GET /api/devotionals
const getDevotionals = async (req, res) => {
  const { month, year, search, limit = 31 } = req.query;
  try {
    let conditions = ['d.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM d.date) = $${idx++}`);
      params.push(parseInt(month));
    }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM d.date) = $${idx++}`);
      params.push(parseInt(year));
    }
    if (search) {
      conditions.push(`(d.title ILIKE $${idx} OR d.theme_scripture ILIKE $${idx} OR d.content ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const { rows } = await query(
      `SELECT d.*
       FROM daily_devotionals d
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.date DESC
       LIMIT $${idx}`,
      [...params, parseInt(limit)]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getDevotionals error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/devotionals/date/:date
const getDevotionalByDate = async (req, res) => {
  const { date } = req.params;
  try {
    const { rows } = await query(
      `SELECT * FROM daily_devotionals WHERE church_id = $1 AND date = $2 LIMIT 1`,
      [req.churchId, date]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'No devotional found for this date' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getDevotionalByDate error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/devotionals/:id
const getDevotional = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT * FROM daily_devotionals WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Devotional not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getDevotional error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/devotionals
const createDevotional = async (req, res) => {
  const {
    date, title, themeScripture, scriptureText, content, confession,
    prayerPoint, bibleReadingPlan, author, isPublished = true
  } = req.body;

  if (!date || !title?.trim() || !themeScripture?.trim() || !content?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Date, Title, Theme Scripture, and Devotional Content are required'
    });
  }

  try {
    const { rows } = await query(
      `INSERT INTO daily_devotionals (
        church_id, date, title, theme_scripture, scripture_text, content,
        confession, prayer_point, bible_reading_plan, author, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (church_id, date) DO UPDATE SET
        title = EXCLUDED.title,
        theme_scripture = EXCLUDED.theme_scripture,
        scripture_text = EXCLUDED.scripture_text,
        content = EXCLUDED.content,
        confession = EXCLUDED.confession,
        prayer_point = EXCLUDED.prayer_point,
        bible_reading_plan = EXCLUDED.bible_reading_plan,
        author = EXCLUDED.author,
        is_published = EXCLUDED.is_published,
        updated_at = NOW()
      RETURNING *`,
      [
        req.churchId, date, title.trim(), themeScripture.trim(), scriptureText || '',
        content, confession || '', prayerPoint || '', bibleReadingPlan || '',
        author || 'Pastoral Team', isPublished !== false
      ]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createDevotional error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/devotionals/:id
const updateDevotional = async (req, res) => {
  const { id } = req.params;
  const {
    date, title, themeScripture, scriptureText, content, confession,
    prayerPoint, bibleReadingPlan, author, isPublished
  } = req.body;

  try {
    const { rows } = await query(
      `UPDATE daily_devotionals SET
        date = COALESCE($1, date),
        title = COALESCE($2, title),
        theme_scripture = COALESCE($3, theme_scripture),
        scripture_text = COALESCE($4, scripture_text),
        content = COALESCE($5, content),
        confession = COALESCE($6, confession),
        prayer_point = COALESCE($7, prayer_point),
        bible_reading_plan = COALESCE($8, bible_reading_plan),
        author = COALESCE($9, author),
        is_published = COALESCE($10, is_published),
        updated_at = NOW()
       WHERE id = $11 AND church_id = $12
       RETURNING *`,
      [
        date, title ? title.trim() : null, themeScripture, scriptureText, content,
        confession, prayerPoint, bibleReadingPlan, author,
        isPublished !== undefined ? isPublished : null, id, req.churchId
      ]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Devotional not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateDevotional error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/devotionals/:id
const deleteDevotional = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `DELETE FROM daily_devotionals WHERE id = $1 AND church_id = $2 RETURNING id`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Devotional not found' });
    return res.json({ success: true, message: 'Devotional deleted' });
  } catch (err) {
    logger.error('deleteDevotional error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/devotionals/:id/broadcast
const broadcastDevotional = async (req, res) => {
  const { id } = req.params;
  const { channel = 'whatsapp' } = req.body;

  try {
    const { rows: devRows } = await query(
      `SELECT d.*, c.name as church_name, c.settings as church_settings
       FROM daily_devotionals d
       JOIN churches c ON c.id = d.church_id
       WHERE d.id = $1 AND d.church_id = $2`,
      [id, req.churchId]
    );

    if (!devRows[0]) return res.status(404).json({ success: false, message: 'Devotional not found' });
    const dev = devRows[0];
    const churchSettings = dev.church_settings?.messaging || {};

    const { rows: members } = await query(
      `SELECT first_name, last_name, email, phone
       FROM members
       WHERE church_id = $1 AND membership_status = 'active' AND (phone IS NOT NULL OR email IS NOT NULL)`,
      [req.churchId]
    );

    if (!members.length) {
      return res.status(400).json({ success: false, message: 'No active members with phone or email found' });
    }

    const messageText = `📖 *${dev.church_name} Daily Devotional*\n*${dev.title}*\n\n` +
      `📅 *Date:* ${dev.date.toISOString ? dev.date.toISOString().slice(0, 10) : dev.date}\n` +
      `📜 *Scripture:* ${dev.theme_scripture}\n${dev.scripture_text ? `_"${dev.scripture_text}"_\n\n` : '\n'}` +
      `${dev.content.slice(0, 500)}...\n\n` +
      `${dev.confession ? `✨ *Declaration:* ${dev.confession}\n\n` : ''}` +
      `${dev.prayer_point ? `🙏 *Prayer Point:* ${dev.prayer_point}\n\n` : ''}` +
      `${dev.bible_reading_plan ? `📚 *Bible in a Year:* ${dev.bible_reading_plan}\n\n` : ''}` +
      `Have a victorious and blessed day in Christ! ✨`;

    let sentCount = 0;
    for (const m of members) {
      if ((channel === 'whatsapp' || channel === 'all') && m.phone) {
        await sendWhatsApp({ to: m.phone, body: messageText }, churchSettings);
        sentCount++;
      } else if (channel === 'email' && m.email) {
        await sendEmail({
          to: m.email,
          subject: `Daily Devotional: ${dev.title} - ${dev.church_name}`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; line-height: 1.6;">
            <h2 style="color: #4f46e5;">${dev.title}</h2>
            <p><strong>Scripture:</strong> ${dev.theme_scripture}</p>
            ${dev.scripture_text ? `<blockquote style="background: #f3f4f6; padding: 12px; border-left: 4px solid #4f46e5;"><em>"${dev.scripture_text}"</em></blockquote>` : ''}
            <div>${dev.content.replace(/\n/g, '<br/>')}</div>
            ${dev.confession ? `<p><strong>Faith Declaration:</strong> ${dev.confession}</p>` : ''}
            ${dev.prayer_point ? `<p><strong>Prayer Point:</strong> ${dev.prayer_point}</p>` : ''}
            ${dev.bible_reading_plan ? `<p><strong>Bible Reading Plan:</strong> ${dev.bible_reading_plan}</p>` : ''}
          </div>`
        }, churchSettings);
        sentCount++;
      }
    }

    await query(
      `UPDATE daily_devotionals SET reminder_sent_at = NOW() WHERE id = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: `Daily Devotional broadcast dispatched to ${sentCount} recipients via ${channel}!`,
      sentCount
    });
  } catch (err) {
    logger.error('broadcastDevotional error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/devotionals/settings
const getDevotionalSettings = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT settings FROM churches WHERE id = $1`,
      [req.churchId]
    );
    const devotionalSettings = rows[0]?.settings?.devotional_reminders || {
      enabled: false,
      schedule: 'morning', // 'morning' (6am), 'night' (9pm), 'both'
      channels: ['whatsapp'],
      morning_time: '06:00',
      night_time: '21:00'
    };
    return res.json({ success: true, data: devotionalSettings });
  } catch (err) {
    logger.error('getDevotionalSettings error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/devotionals/settings
const updateDevotionalSettings = async (req, res) => {
  const { enabled, schedule, channels, morning_time, night_time } = req.body;
  try {
    const { rows } = await query(
      `UPDATE churches SET
        settings = jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{devotional_reminders}',
          $1::jsonb,
          true
        ),
        updated_at = NOW()
       WHERE id = $2
       RETURNING settings`,
      [
        JSON.stringify({
          enabled: Boolean(enabled),
          schedule: schedule || 'morning',
          channels: Array.isArray(channels) ? channels : ['whatsapp'],
          morning_time: morning_time || '06:00',
          night_time: night_time || '21:00'
        }),
        req.churchId
      ]
    );

    return res.json({
      success: true,
      data: rows[0]?.settings?.devotional_reminders,
      message: 'Devotional reminder settings updated!'
    });
  } catch (err) {
    logger.error('updateDevotionalSettings error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/devotionals/seed-samples
const seedSampleDevotionals = async (req, res) => {
  try {
    const today = new Date();
    const samples = [
      {
        daysOffset: 0,
        title: 'Walking in the Light of Divine Favor',
        scripture: 'Psalm 5:12',
        scriptureText: 'For You, O Lord, will bless the righteous; with favor You will surround him as with a shield.',
        content: `God's favor is not an accident—it is your covenant heritage in Christ Jesus! In biblical times, a shield covered a soldier from top to bottom, protecting him from every flying arrow. In the exact same way, the favor of God surrounds your business, your family, your health, and your ministry.\n\nWhen favor is on your life:\n1. Doors that were locked against others open willingly for you.\n2. People go out of their way to support and bless your God-given vision.\n3. Human limitations give way to supernatural divine acceleration.\n\nWalk out your door today conscious that you are encompassed with divine favor!`,
        confession: 'I am surrounded with the favor of God as with a shield. In my going out and coming in, doors of breakthrough open for me today in Jesus’ name!',
        prayer: 'Father, thank You for Your endless favor over my life. Grant me wisdom to steward every divine opportunity that comes my way today. Amen.',
        plan: 'Genesis 1-3, Matthew 1'
      },
      {
        daysOffset: 1,
        title: 'The Peace That Transcends Understanding',
        scripture: 'Philippians 4:6-7',
        scriptureText: 'Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God; and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.',
        content: `Anxiety is a thief of joy and spiritual clarity. Notice the Apostle Paul’s instruction: do not worry about ANYTHING, but pray about EVERYTHING!\n\nWhen turbulent situations arise:\n- Exchange your heavy burden for God's supernatural peace through thanksgiving.\n- Realize that worry cannot change a single outcome, but faith-filled prayer changes atmospheres.\n\nRest in the assurance that God is already in your tomorrow, making rough paths straight.`,
        confession: 'I refuse to be anxious or fearful. The peace of God guards my heart, thoughts, and decisions today. I have victory in Christ!',
        prayer: 'Lord, I surrender every anxiety into Your loving hands. Fill my soul with Your supernatural peace and perfect rest. Amen.',
        plan: 'Genesis 4-6, Matthew 2'
      }
    ];

    for (const s of samples) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + s.daysOffset);
      const dateStr = targetDate.toISOString().slice(0, 10);

      await query(
        `INSERT INTO daily_devotionals (
          church_id, date, title, theme_scripture, scripture_text, content,
          confession, prayer_point, bible_reading_plan, author, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pastoral Leadership', true)
        ON CONFLICT (church_id, date) DO NOTHING`,
        [req.churchId, dateStr, s.title, s.scripture, s.scriptureText, s.content, s.confession, s.prayer, s.plan]
      );
    }

    return res.json({ success: true, message: 'Sample daily devotionals loaded successfully!' });
  } catch (err) {
    logger.error('seedSampleDevotionals error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDevotionals,
  getDevotionalByDate,
  getDevotional,
  createDevotional,
  updateDevotional,
  deleteDevotional,
  broadcastDevotional,
  getDevotionalSettings,
  updateDevotionalSettings,
  seedSampleDevotionals,
};
