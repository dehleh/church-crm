const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// GET /api/discipleship/courses
const getCourses = async (req, res) => {
  try {
    const { category, search } = req.query;
    let conditions = ['c.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (category) {
      conditions.push(`c.category = $${idx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(c.title ILIKE $${idx} OR c.description ILIKE $${idx} OR c.instructor_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const { rows } = await query(
      `SELECT c.*,
        COUNT(DISTINCT l.id)::int as lesson_count,
        COUNT(DISTINCT e.id)::int as enrolled_count,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed')::int as completed_count
       FROM discipleship_courses c
       LEFT JOIN discipleship_lessons l ON l.course_id = c.id
       LEFT JOIN discipleship_enrollments e ON e.course_id = c.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getCourses error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/discipleship/courses/:id
const getCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: courseRows } = await query(
      `SELECT c.*,
        COUNT(DISTINCT l.id)::int as lesson_count,
        COUNT(DISTINCT e.id)::int as enrolled_count,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed')::int as completed_count
       FROM discipleship_courses c
       LEFT JOIN discipleship_lessons l ON l.course_id = c.id
       LEFT JOIN discipleship_enrollments e ON e.course_id = c.id
       WHERE c.id = $1 AND c.church_id = $2
       GROUP BY c.id`,
      [id, req.churchId]
    );

    if (!courseRows[0]) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const { rows: lessons } = await query(
      `SELECT * FROM discipleship_lessons
       WHERE course_id = $1 AND church_id = $2
       ORDER BY order_num ASC, created_at ASC`,
      [id, req.churchId]
    );

    const { rows: enrollments } = await query(
      `SELECT e.*, m.first_name, m.last_name, m.email, m.phone, m.profile_photo_url, m.member_number
       FROM discipleship_enrollments e
       JOIN members m ON m.id = e.member_id
       WHERE e.course_id = $1 AND e.church_id = $2
       ORDER BY e.enrolled_at DESC`,
      [id, req.churchId]
    );

    return res.json({
      success: true,
      data: {
        ...courseRows[0],
        lessons,
        enrollments,
      },
    });
  } catch (err) {
    logger.error('getCourse error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/discipleship/courses
const createCourse = async (req, res) => {
  const {
    title, description, category = 'foundation', level = 'beginner',
    coverImageUrl, instructorName, durationWeeks = 4, isPublished = true
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: 'Course title is required' });
  }

  try {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
    const { rows } = await query(
      `INSERT INTO discipleship_courses (
        church_id, title, slug, description, category, level, cover_image_url,
        instructor_name, duration_weeks, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.churchId, title.trim(), slug, description || '', category, level,
        coverImageUrl || null, instructorName || null, parseInt(durationWeeks) || 4,
        isPublished !== false
      ]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createCourse error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/discipleship/courses/:id
const updateCourse = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, category, level, coverImageUrl,
    instructorName, durationWeeks, isPublished
  } = req.body;

  try {
    const { rows } = await query(
      `UPDATE discipleship_courses SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        level = COALESCE($4, level),
        cover_image_url = COALESCE($5, cover_image_url),
        instructor_name = COALESCE($6, instructor_name),
        duration_weeks = COALESCE($7, duration_weeks),
        is_published = COALESCE($8, is_published),
        updated_at = NOW()
       WHERE id = $9 AND church_id = $10
       RETURNING *`,
      [
        title ? title.trim() : null, description, category, level, coverImageUrl,
        instructorName, durationWeeks ? parseInt(durationWeeks) : null,
        isPublished !== undefined ? isPublished : null, id, req.churchId
      ]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateCourse error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/discipleship/courses/:id
const deleteCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `DELETE FROM discipleship_courses WHERE id = $1 AND church_id = $2 RETURNING id`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    logger.error('deleteCourse error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/discipleship/courses/:id/lessons
const createLesson = async (req, res) => {
  const { id: courseId } = req.params;
  const {
    title, description, content, scriptureReferences, videoUrl, audioUrl,
    orderNum, durationMinutes
  } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'Lesson title and content are required' });
  }

  try {
    // If orderNum not provided, calculate next orderNum
    let nextOrder = orderNum;
    if (!nextOrder) {
      const { rows: maxOrder } = await query(
        `SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM discipleship_lessons WHERE course_id = $1`,
        [courseId]
      );
      nextOrder = maxOrder[0].next_order;
    }

    const { rows } = await query(
      `INSERT INTO discipleship_lessons (
        course_id, church_id, title, description, content, scripture_references,
        video_url, audio_url, order_num, duration_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        courseId, req.churchId, title.trim(), description || '', content,
        scriptureReferences || '', videoUrl || null, audioUrl || null,
        nextOrder, parseInt(durationMinutes) || 20
      ]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createLesson error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/discipleship/lessons/:lessonId
const updateLesson = async (req, res) => {
  const { lessonId } = req.params;
  const {
    title, description, content, scriptureReferences, videoUrl, audioUrl,
    orderNum, durationMinutes
  } = req.body;

  try {
    const { rows } = await query(
      `UPDATE discipleship_lessons SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        content = COALESCE($3, content),
        scripture_references = COALESCE($4, scripture_references),
        video_url = COALESCE($5, video_url),
        audio_url = COALESCE($6, audio_url),
        order_num = COALESCE($7, order_num),
        duration_minutes = COALESCE($8, duration_minutes),
        updated_at = NOW()
       WHERE id = $9 AND church_id = $10
       RETURNING *`,
      [
        title ? title.trim() : null, description, content, scriptureReferences,
        videoUrl, audioUrl, orderNum !== undefined ? parseInt(orderNum) : null,
        durationMinutes ? parseInt(durationMinutes) : null, lessonId, req.churchId
      ]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Lesson not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateLesson error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/discipleship/lessons/:lessonId
const deleteLesson = async (req, res) => {
  const { lessonId } = req.params;
  try {
    const { rows } = await query(
      `DELETE FROM discipleship_lessons WHERE id = $1 AND church_id = $2 RETURNING id`,
      [lessonId, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Lesson not found' });
    return res.json({ success: true, message: 'Lesson removed' });
  } catch (err) {
    logger.error('deleteLesson error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/discipleship/courses/:id/enroll
const enrollMemberAdmin = async (req, res) => {
  const { id: courseId } = req.params;
  const { memberId, notes } = req.body;

  if (!memberId) {
    return res.status(400).json({ success: false, message: 'Member ID is required' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO discipleship_enrollments (
        church_id, course_id, member_id, status, progress_percent, notes
      ) VALUES ($1, $2, $3, 'in_progress', 0, $4)
      ON CONFLICT (course_id, member_id) DO UPDATE SET
        status = 'in_progress',
        updated_at = NOW()
      RETURNING *`,
      [req.churchId, courseId, memberId, notes || null]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('enrollMemberAdmin error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/discipleship/seed-default
const seedDefaultCourses = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Foundation Course
    const foundationCourseId = uuidv4();
    await client.query(
      `INSERT INTO discipleship_courses (
        id, church_id, title, slug, description, category, level, instructor_name, duration_weeks, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [
        foundationCourseId,
        req.churchId,
        "Believer's Foundation School",
        'believers-foundation-school',
        'Essential biblical truths for new converts and growing believers to build an unshakeable spiritual foundation in Christ.',
        'foundation',
        'beginner',
        'Pastoral Training Team',
        4,
      ]
    );

    const foundationLessons = [
      {
        title: 'Lesson 1: The New Birth & Assurance of Salvation',
        scripture: 'John 3:1-8, 2 Corinthians 5:17, 1 John 5:11-13',
        content: `### Welcome to the Family of God!\n\nWhen you surrender your life to Jesus Christ, you do not simply adopt a religion—you experience a spiritual rebirth! In John 3:3, Jesus declared: *"Except a man be born again, he cannot see the kingdom of God."*\n\n#### What Happens at Salvation?\n1. **Total Forgiveness:** All your past sins are wiped clean by the blood of Jesus.\n2. **New Creation Identity:** You are no longer defined by your past failures.\n3. **Divine Adoption:** You are now a child of God with direct access to the Father.\n\n#### Key Scriptures for Meditation:\n- *Romans 8:16*: The Spirit Himself bears witness with our spirit that we are children of God.\n- *Ephesians 2:8-9*: By grace you have been saved through faith, and that not of yourselves.`,
        duration: 25,
      },
      {
        title: 'Lesson 2: The Power of Prayer & Fellowship with God',
        scripture: 'Philippians 4:6-7, Luke 18:1, Matthew 6:9-13',
        content: `### Cultivating an Effective Prayer Life\n\nPrayer is not a religious monologue; it is two-way communication and heartfelt fellowship with our Heavenly Father.\n\n#### Essential Components of Prayer:\n1. **Thanksgiving & Worship:** Entering His gates with thanksgiving.\n2. **Petition & Intercession:** Bringing our needs and lifting others in faith.\n3. **Listening & Surrender:** Allowing God's Spirit to speak and guide our steps.\n\nNever let a day pass without taking time to speak with your Father in heaven.`,
        duration: 20,
      },
      {
        title: 'Lesson 3: The Person & Power of the Holy Spirit',
        scripture: 'Acts 1:8, John 14:16-17, Galatians 5:22-23',
        content: `### Walking in the Power of the Spirit\n\nThe Holy Spirit is not an impersonal force; He is the third Person of the Godhead, sent by the Father to be our Helper, Comforter, Counselor, and Teacher.\n\n#### The Twofold Ministry of the Spirit:\n1. **The Fruit of the Spirit (Character):** Love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.\n2. **The Gifts of the Spirit (Power):** Supernatural empowerment for ministry, signs, wonders, and effective witness.`,
        duration: 30,
      },
      {
        title: 'Lesson 4: Kingdom Stewardship, Giving & Service',
        scripture: 'Malachi 3:10, 2 Corinthians 9:6-8, Romans 12:1',
        content: `### Living for What Truly Matters\n\nEverything we have—our time, talents, and treasure—belongs to God. True discipleship involves presenting our lives as living sacrifices.\n\n#### Biblical Principles of Stewardship:\n- **Tithing & Generosity:** Honoring God with the firstfruits of our increase.\n- **Serving in God’s House:** Finding a ministry unit (Choir, Protocol, Media, Ushering) to serve with love.\n- **Great Commission:** Reaching the lost and making disciples everywhere we go.`,
        duration: 25,
      },
    ];

    let order = 1;
    for (const l of foundationLessons) {
      await client.query(
        `INSERT INTO discipleship_lessons (
          course_id, church_id, title, scripture_references, content, order_num, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [foundationCourseId, req.churchId, l.title, l.scripture, l.content, order++, l.duration]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: "Standard Believer's Foundation School seeded successfully!" });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('seedDefaultCourses error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  enrollMemberAdmin,
  seedDefaultCourses,
};
