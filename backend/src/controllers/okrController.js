const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// ── GET /api/okrs ─────────────────────────────────────────────
const getOkrs = async (req, res) => {
  const {
    targetRole, periodType, periodDetail, fiscalYear, userId,
    departmentId, status, kpiCategory, verificationStatus
  } = req.query;
  try {
    const conditions = ['o.church_id = $1'];
    const params = [req.churchId];
    let idx = 2;

    if (targetRole && targetRole !== 'all') {
      conditions.push(`o.target_role = $${idx++}`);
      params.push(targetRole);
    }
    if (periodType && periodType !== 'all') {
      conditions.push(`o.period_type = $${idx++}`);
      params.push(periodType);
    }
    if (periodDetail) {
      conditions.push(`o.period_detail = $${idx++}`);
      params.push(periodDetail);
    }
    if (fiscalYear) {
      conditions.push(`o.fiscal_year = $${idx++}`);
      params.push(parseInt(fiscalYear, 10));
    }
    if (userId) {
      conditions.push(`o.user_id = $${idx++}`);
      params.push(userId);
    }
    if (departmentId) {
      conditions.push(`o.department_id = $${idx++}`);
      params.push(departmentId);
    }
    if (status && status !== 'all') {
      conditions.push(`o.status = $${idx++}`);
      params.push(status);
    }
    if (kpiCategory && kpiCategory !== 'all') {
      conditions.push(`o.kpi_category = $${idx++}`);
      params.push(kpiCategory);
    }
    if (verificationStatus && verificationStatus !== 'all') {
      conditions.push(`o.verification_status = $${idx++}`);
      params.push(verificationStatus);
    }

    // Role-based visibility: Directors and HODs see their own assigned OKRs unless Admin/Pastor
    const isLeadership = ['senior_pastor', 'head_pastor', 'admin', 'church_admin', 'pastor'].includes(req.user.role);
    if (!isLeadership) {
      conditions.push(`(o.user_id = $${idx++} OR o.created_by = $${idx - 1})`);
      params.push(req.user.id);
    }

    const { rows } = await query(
      `SELECT o.*,
              u.first_name || ' ' || u.last_name as assignee_name,
              u.email as assignee_email,
              u.role as assignee_role,
              d.name as department_name,
              cb.first_name || ' ' || cb.last_name as created_by_name,
              dc.title as course_title,
              dc.duration_weeks as course_duration_weeks,
              dc.category as course_category,
              vb.first_name || ' ' || vb.last_name as verified_by_name
       FROM staff_okrs o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN departments d ON d.id = o.department_id
       LEFT JOIN users cb ON cb.id = o.created_by
       LEFT JOIN discipleship_courses dc ON dc.id = o.course_id
       LEFT JOIN users vb ON vb.id = o.verified_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.fiscal_year DESC, o.progress_pct ASC, o.created_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getOkrs error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading OKRs' });
  }
};

// ── GET /api/okrs/scorecard ───────────────────────────────────
// High-level performance scorecard grouping by Directors and HODs
const getPerformanceScorecard = async (req, res) => {
  const { fiscalYear } = req.query;
  const year = fiscalYear ? parseInt(fiscalYear, 10) : new Date().getFullYear();

  try {
    // 1. Get all staff with OKRs or eligible for OKRs (directors and hods)
    const { rows: staffList } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.department_id,
              (
                SELECT json_agg(json_build_object('id', d.id, 'name', d.name))
                FROM departments d
                WHERE d.director_id = u.id AND d.is_active = true
              ) as supervised_departments,
              hd.name as hod_department_name
       FROM users u
       LEFT JOIN departments hd ON hd.id = u.department_id
       WHERE u.church_id = $1 AND u.is_active = true
         AND (u.role IN ('director', 'hod') OR u.id IN (SELECT user_id FROM staff_okrs WHERE church_id = $1))
       ORDER BY u.role, u.first_name`,
      [req.churchId]
    );

    // 2. Aggregate OKRs for the fiscal year
    const { rows: okrStats } = await query(
      `SELECT
         user_id,
         COUNT(*) as total_okrs,
         COUNT(*) FILTER (WHERE status = 'achieved' OR status = 'exceeded' OR progress_pct >= 100) as achieved_count,
         COUNT(*) FILTER (WHERE status = 'in_progress' AND progress_pct >= 50 AND progress_pct < 100) as on_track_count,
         COUNT(*) FILTER (WHERE status = 'lagging' OR (status = 'in_progress' AND progress_pct < 50)) as lagging_count,
         ROUND(COALESCE(AVG(progress_pct), 0), 1) as avg_progress_pct,
         ROUND(COALESCE(SUM(progress_pct * COALESCE(weight, 1.0)) / NULLIF(SUM(COALESCE(weight, 1.0)), 0), 0), 1) as weighted_progress_pct
       FROM staff_okrs
       WHERE church_id = $1 AND fiscal_year = $2
       GROUP BY user_id`,
      [req.churchId, year]
    );

    const statsMap = {};
    okrStats.forEach(s => { statsMap[s.user_id] = s; });

    const scorecard = staffList.map(staff => {
      const stats = statsMap[staff.id] || {
        total_okrs: 0,
        achieved_count: 0,
        on_track_count: 0,
        lagging_count: 0,
        avg_progress_pct: 0,
        weighted_progress_pct: 0,
      };

      const performancePct = parseFloat(stats.weighted_progress_pct || stats.avg_progress_pct || 0);
      let grade = 'Not Evaluated';
      let gradeColor = 'gray';
      if (stats.total_okrs > 0) {
        if (performancePct >= 90) { grade = 'Outstanding (A+)'; gradeColor = 'emerald'; }
        else if (performancePct >= 75) { grade = 'Exceeds Expectations (A)'; gradeColor = 'teal'; }
        else if (performancePct >= 60) { grade = 'Meets Target (B)'; gradeColor = 'blue'; }
        else if (performancePct >= 40) { grade = 'Needs Improvement (C)'; gradeColor = 'amber'; }
        else { grade = 'Critical Lag (D)'; gradeColor = 'rose'; }
      }

      return {
        ...staff,
        total_okrs: parseInt(stats.total_okrs, 10),
        achieved_count: parseInt(stats.achieved_count, 10),
        on_track_count: parseInt(stats.on_track_count, 10),
        lagging_count: parseInt(stats.lagging_count, 10),
        performance_pct: performancePct,
        grade,
        gradeColor,
      };
    });

    const totalStaff = scorecard.length;
    const evaluatedStaff = scorecard.filter(s => s.total_okrs > 0);
    const overallAvg = evaluatedStaff.length > 0
      ? Math.round(evaluatedStaff.reduce((sum, s) => sum + s.performance_pct, 0) / evaluatedStaff.length)
      : 0;

    return res.json({
      success: true,
      data: scorecard,
      summary: {
        fiscalYear: year,
        totalStaff,
        evaluatedStaffCount: evaluatedStaff.length,
        overallLeadershipAchievementPct: overallAvg,
      }
    });
  } catch (err) {
    logger.error('getPerformanceScorecard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading performance scorecard' });
  }
};

// ── POST /api/okrs ────────────────────────────────────────────
// Senior Pastor / Lead Pastor sets an OKR
const createOkr = async (req, res) => {
  const {
    userId, targetRole, departmentId, title, description,
    periodType = 'quarterly', periodDetail, fiscalYear,
    targetMetric, targetValue = 100, weight = 1.0, keyResults = [],
    kpiCategory = 'core_leadership', courseId = null, videoUrl = null,
    trainingDate = null, trainingVenue = null
  } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ success: false, message: 'Assignee and OKR title are required' });
  }

  try {
    const id = uuidv4();
    const finalYear = fiscalYear || new Date().getFullYear();
    const { rows } = await query(
      `INSERT INTO staff_okrs (
        id, church_id, branch_id, user_id, target_role, department_id,
        title, description, period_type, period_detail, fiscal_year,
        target_metric, target_value, current_value, progress_pct, weight,
        status, key_results, created_by,
        kpi_category, course_id, video_url, training_date, training_venue, verification_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,0,$14,'in_progress',$15,$16,$17,$18,$19,$20,$21,'pending')
      RETURNING *`,
      [
        id, req.churchId, req.branchId || null, userId, targetRole || 'hod', departmentId || null,
        title, description || null, periodType, periodDetail || null, finalYear,
        targetMetric || null, targetValue || 100, weight || 1.0, JSON.stringify(keyResults), req.user.id,
        kpiCategory || 'core_leadership', courseId || null, videoUrl || null,
        trainingDate || null, trainingVenue || null
      ]
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Leadership OKR created successfully'
    });
  } catch (err) {
    logger.error('createOkr error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error creating OKR' });
  }
};

// ── PUT /api/okrs/:id ─────────────────────────────────────────
const updateOkr = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, periodType, periodDetail, fiscalYear,
    targetMetric, targetValue, weight, keyResults, status, departmentId,
    kpiCategory, courseId, videoUrl, trainingDate, trainingVenue
  } = req.body;

  try {
    const { rows } = await query(
      `UPDATE staff_okrs SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        period_type = COALESCE($5, period_type),
        period_detail = COALESCE($6, period_detail),
        fiscal_year = COALESCE($7, fiscal_year),
        target_metric = COALESCE($8, target_metric),
        target_value = COALESCE($9, target_value),
        weight = COALESCE($10, weight),
        key_results = CASE WHEN $11::jsonb IS NOT NULL THEN $11::jsonb ELSE key_results END,
        status = COALESCE($12, status),
        department_id = COALESCE($13, department_id),
        kpi_category = COALESCE($14, kpi_category),
        course_id = COALESCE($15, course_id),
        video_url = COALESCE($16, video_url),
        training_date = COALESCE($17, training_date),
        training_venue = COALESCE($18, training_venue),
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [
        id, req.churchId, title, description, periodType, periodDetail,
        fiscalYear ? parseInt(fiscalYear, 10) : null,
        targetMetric, targetValue, weight,
        keyResults ? JSON.stringify(keyResults) : null,
        status, departmentId || null,
        kpiCategory, courseId || null, videoUrl || null,
        trainingDate || null, trainingVenue || null
      ]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'OKR not found' });
    return res.json({ success: true, data: rows[0], message: 'OKR updated successfully' });
  } catch (err) {
    logger.error('updateOkr error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating OKR' });
  }
};

// ── PATCH /api/okrs/:id/progress ──────────────────────────────
// Staff self-assessment & progress reporting
const updateProgress = async (req, res) => {
  const { id } = req.params;
  const { currentValue, progressPct, keyResults, selfAssessmentNotes, reflectionNotes } = req.body;

  try {
    const { rows: existing } = await query(
      `SELECT * FROM staff_okrs WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );
    if (!existing[0]) return res.status(404).json({ success: false, message: 'OKR not found' });
    const okr = existing[0];

    // Compute progress %
    let calculatedProgress = okr.progress_pct;
    if (progressPct !== undefined && progressPct !== null) {
      calculatedProgress = Math.min(100, Math.max(0, parseInt(progressPct, 10)));
    } else if (currentValue !== undefined && okr.target_value > 0) {
      calculatedProgress = Math.min(100, Math.max(0, Math.round((currentValue / okr.target_value) * 100)));
    } else if (Array.isArray(keyResults) && keyResults.length > 0) {
      const completed = keyResults.filter(k => k.completed || k.current >= k.target).length;
      calculatedProgress = Math.round((completed / keyResults.length) * 100);
    }

    let status = okr.status;
    if (calculatedProgress >= 100) {
      status = 'achieved';
    } else if (calculatedProgress < 30) {
      status = 'lagging';
    } else {
      status = 'in_progress';
    }

    const verificationStatus = (reflectionNotes || (Array.isArray(keyResults) && keyResults.some(k => k.completed)))
      ? (okr.verification_status === 'verified' ? 'verified' : 'submitted_for_review')
      : okr.verification_status;

    const { rows } = await query(
      `UPDATE staff_okrs SET
        current_value = COALESCE($3, current_value),
        progress_pct = $4,
        key_results = CASE WHEN $5::jsonb IS NOT NULL THEN $5::jsonb ELSE key_results END,
        self_assessment_notes = COALESCE($6, self_assessment_notes),
        reflection_notes = COALESCE($7, reflection_notes),
        verification_status = $8,
        last_reported_at = NOW(),
        status = $9,
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [
        id, req.churchId, currentValue !== undefined ? currentValue : null,
        calculatedProgress, keyResults ? JSON.stringify(keyResults) : null,
        selfAssessmentNotes || null, reflectionNotes || null,
        verificationStatus, status
      ]
    );

    return res.json({
      success: true,
      data: rows[0],
      message: `Progress updated to ${calculatedProgress}%`
    });
  } catch (err) {
    logger.error('updateProgress error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating progress' });
  }
};

// ── PATCH /api/okrs/:id/verify ────────────────────────────────
// Senior Pastor review & official verification
const verifyOkr = async (req, res) => {
  const { id } = req.params;
  const { verified = true, pastoralFeedback, status, progressPct, keyResults } = req.body;

  try {
    const isVerified = Boolean(verified);
    const { rows } = await query(
      `UPDATE staff_okrs SET
        verification_status = $3,
        verified_at = CASE WHEN $4::boolean THEN NOW() ELSE NULL END,
        verified_by = CASE WHEN $4::boolean THEN $5 ELSE NULL END,
        pastoral_feedback = COALESCE($6, pastoral_feedback),
        evaluator_notes = COALESCE($6, evaluator_notes),
        status = COALESCE($7, CASE WHEN $4::boolean THEN 'achieved' ELSE status END),
        progress_pct = CASE WHEN $8::int IS NOT NULL THEN $8::int ELSE (CASE WHEN $4::boolean AND progress_pct < 100 THEN 100 ELSE progress_pct END) END,
        key_results = CASE WHEN $9::jsonb IS NOT NULL THEN $9::jsonb ELSE key_results END,
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [
        id, req.churchId,
        isVerified ? 'verified' : 'revision_requested',
        isVerified,
        req.user.id,
        pastoralFeedback || null,
        status || null,
        progressPct !== undefined ? parseInt(progressPct, 10) : null,
        keyResults ? JSON.stringify(keyResults) : null
      ]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'OKR not found' });
    return res.json({
      success: true,
      data: rows[0],
      message: isVerified ? 'KPI endorsed and verified by Senior Pastor ✅' : 'Revision feedback submitted to leader'
    });
  } catch (err) {
    logger.error('verifyOkr error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error verifying OKR' });
  }
};

// ── GET /api/okrs/granular-summary ────────────────────────────
// Granular breakdown of Trainings, Courses, Video Studies & Core Duties
const getGranularKpiSummary = async (req, res) => {
  const { fiscalYear } = req.query;
  const year = fiscalYear ? parseInt(fiscalYear, 10) : new Date().getFullYear();

  try {
    const { rows: stats } = await query(
      `SELECT
         COUNT(*) as total_kpis,
         COUNT(*) FILTER (WHERE kpi_category = 'leadership_training') as trainings_count,
         COUNT(*) FILTER (WHERE kpi_category = 'leadership_training' AND (progress_pct >= 100 OR status = 'achieved')) as trainings_attended,
         COUNT(*) FILTER (WHERE kpi_category = 'leadership_training' AND verification_status = 'verified') as trainings_verified,

         COUNT(*) FILTER (WHERE kpi_category = 'discipleship_course') as courses_count,
         COUNT(*) FILTER (WHERE kpi_category = 'discipleship_course' AND (progress_pct >= 100 OR status = 'achieved')) as courses_completed,

         COUNT(*) FILTER (WHERE kpi_category = 'video_study') as videos_count,
         COUNT(*) FILTER (WHERE kpi_category = 'video_study' AND (reflection_notes IS NOT NULL OR progress_pct >= 100)) as videos_reported,
         COUNT(*) FILTER (WHERE kpi_category = 'video_study' AND verification_status = 'verified') as videos_verified,

         COUNT(*) FILTER (WHERE kpi_category = 'departmental_duty') as dept_duties_count,
         COUNT(*) FILTER (WHERE kpi_category = 'departmental_duty' AND progress_pct >= 70) as dept_duties_on_track,

         COUNT(*) FILTER (WHERE verification_status = 'submitted_for_review') as pending_review_count
       FROM staff_okrs
       WHERE church_id = $1 AND fiscal_year = $2`,
      [req.churchId, year]
    );

    return res.json({
      success: true,
      data: stats[0] || {
        total_kpis: 0,
        trainings_count: 0, trainings_attended: 0, trainings_verified: 0,
        courses_count: 0, courses_completed: 0,
        videos_count: 0, videos_reported: 0, videos_verified: 0,
        dept_duties_count: 0, dept_duties_on_track: 0,
        pending_review_count: 0
      }
    });
  } catch (err) {
    logger.error('getGranularKpiSummary error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading granular KPI summary' });
  }
};

// ── PATCH /api/okrs/:id/review ────────────────────────────────
// Senior Pastor review & rating
const reviewOkr = async (req, res) => {
  const { id } = req.params;
  const { evaluatorNotes, status, progressPct } = req.body;

  try {
    const { rows } = await query(
      `UPDATE staff_okrs SET
        evaluator_notes = COALESCE($3, evaluator_notes),
        status = COALESCE($4, status),
        progress_pct = CASE WHEN $5::int IS NOT NULL THEN $5::int ELSE progress_pct END,
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [id, req.churchId, evaluatorNotes, status, progressPct !== undefined ? parseInt(progressPct, 10) : null]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'OKR not found' });
    return res.json({ success: true, data: rows[0], message: 'Evaluation saved' });
  } catch (err) {
    logger.error('reviewOkr error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error reviewing OKR' });
  }
};

// ── DELETE /api/okrs/:id ──────────────────────────────────────
const deleteOkr = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await query(
      `DELETE FROM staff_okrs WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'OKR not found' });
    return res.json({ success: true, message: 'OKR deleted successfully' });
  } catch (err) {
    logger.error('deleteOkr error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error deleting OKR' });
  }
};

module.exports = {
  getOkrs,
  getPerformanceScorecard,
  getGranularKpiSummary,
  createOkr,
  updateOkr,
  updateProgress,
  verifyOkr,
  reviewOkr,
  deleteOkr,
};
