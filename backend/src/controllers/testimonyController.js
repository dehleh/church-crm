const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// ── GET /api/testimonies/stats ────────────────────────────────
const getTestimonyStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
         COUNT(*) FILTER (WHERE status = 'approved_for_service') as approved_for_service,
         COUNT(*) FILTER (WHERE status = 'approved_online') as approved_online,
         COUNT(*) FILTER (WHERE status = 'shared_in_service') as shared_in_service,
         COUNT(*) FILTER (WHERE scheduled_service_date >= CURRENT_DATE AND status = 'approved_for_service') as upcoming_service_ready
       FROM testimonies
       WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getTestimonyStats error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading testimony stats' });
  }
};

// ── GET /api/testimonies ──────────────────────────────────────
const getTestimonies = async (req, res) => {
  const { page = 1, limit = 20, status, category, search, scheduledDate } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = ['t.church_id = $1'];
    const params = [req.churchId];
    let idx = 2;

    if (status && status !== 'all') {
      conditions.push(`t.status = $${idx++}`);
      params.push(status);
    }
    if (category && category !== 'all') {
      conditions.push(`t.category = $${idx++}`);
      params.push(category);
    }
    if (scheduledDate) {
      conditions.push(`t.scheduled_service_date = $${idx++}`);
      params.push(scheduledDate);
    }
    if (search) {
      conditions.push(`(t.title ILIKE $${idx} OR t.content ILIKE $${idx} OR t.submitter_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM testimonies t WHERE ${where}`, params);

    params.push(parseInt(limit, 10), offset);
    const { rows } = await query(
      `SELECT t.*,
              m.profile_photo_url as member_photo_url,
              u.first_name || ' ' || u.last_name as reviewer_name
       FROM testimonies t
       LEFT JOIN members m ON m.id = t.member_id
       LEFT JOIN users u ON u.id = t.reviewed_by
       WHERE ${where}
       ORDER BY
         CASE WHEN t.status = 'pending_review' THEN 1
              WHEN t.status = 'approved_for_service' THEN 2
              ELSE 3 END,
         t.scheduled_service_date ASC NULLS LAST,
         t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(countRes.rows[0].count / limit),
      }
    });
  } catch (err) {
    logger.error('getTestimonies error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading testimonies' });
  }
};

// ── GET /api/testimonies/:id ──────────────────────────────────
const getTestimony = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT t.*,
              m.phone as member_phone, m.email as member_email,
              u.first_name || ' ' || u.last_name as reviewer_name
       FROM testimonies t
       LEFT JOIN members m ON m.id = t.member_id
       LEFT JOIN users u ON u.id = t.reviewed_by
       WHERE t.id = $1 AND t.church_id = $2`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Testimony not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getTestimony error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/testimonies ─────────────────────────────────────
// Submit a praise report / testimony
const submitTestimony = async (req, res) => {
  const {
    title, content, category = 'breakthrough',
    submitterName, submitterPhone, submitterEmail,
    isAnonymous = false, memberId, photoUrl, testimonyDate
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required' });
  }

  const name = submitterName || (req.user ? `${req.user.first_name} ${req.user.last_name}` : 'Church Member');

  try {
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO testimonies (
        id, church_id, branch_id, member_id, submitter_name, submitter_phone,
        submitter_email, is_anonymous, title, content, category,
        testimony_date, photo_url, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review')
      RETURNING *`,
      [
        id, req.churchId, req.branchId || null, memberId || null, name,
        submitterPhone || null, submitterEmail || null, isAnonymous,
        title, content, category, testimonyDate || new Date().toISOString().split('T')[0], photoUrl || null
      ]
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Testimony submitted successfully! It is now in pastoral review.'
    });
  } catch (err) {
    logger.error('submitTestimony error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error submitting testimony' });
  }
};

// ── PUT /api/testimonies/:id/review ───────────────────────────
// Pastoral Review & Approval Workflow
const reviewTestimony = async (req, res) => {
  const { id } = req.params;
  const { status, scheduledServiceDate, pastoralNotes } = req.body;

  const validStatuses = ['pending_review', 'approved_for_service', 'approved_online', 'shared_in_service', 'rejected', 'archived'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid testimony status' });
  }

  try {
    const sharedAtClause = status === 'shared_in_service' ? 'NOW()' : 'service_shared_at';
    const { rows } = await query(
      `UPDATE testimonies SET
        status = COALESCE($3, status),
        scheduled_service_date = CASE WHEN $4::text IS NOT NULL THEN $4::date ELSE scheduled_service_date END,
        pastoral_notes = COALESCE($5, pastoral_notes),
        reviewed_by = $6,
        reviewed_at = NOW(),
        service_shared_at = ${sharedAtClause},
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [id, req.churchId, status, scheduledServiceDate || null, pastoralNotes || null, req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Testimony not found' });

    let actionLabel = 'Testimony review updated';
    if (status === 'approved_for_service') actionLabel = `Testimony approved for church service presentation${scheduledServiceDate ? ` on ${scheduledServiceDate}` : ''}!`;
    if (status === 'approved_online') actionLabel = 'Testimony approved for online bulletin publication!';
    if (status === 'shared_in_service') actionLabel = 'Testimony marked as shared in church service!';

    return res.json({ success: true, data: rows[0], message: actionLabel });
  } catch (err) {
    logger.error('reviewTestimony error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating testimony review' });
  }
};

// ── DELETE /api/testimonies/:id ───────────────────────────────
const deleteTestimony = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await query(
      `DELETE FROM testimonies WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Testimony not found' });
    return res.json({ success: true, message: 'Testimony deleted successfully' });
  } catch (err) {
    logger.error('deleteTestimony error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error deleting testimony' });
  }
};

module.exports = {
  getTestimonyStats,
  getTestimonies,
  getTestimony,
  submitTestimony,
  reviewTestimony,
  deleteTestimony,
};
