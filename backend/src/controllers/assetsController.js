const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');

// GET /api/assets/stats
const getAssetStats = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const params = [req.churchId];
    let extraCond = '';
    let idx = 2;
    if (req.branchId) {
      params.push(req.branchId);
      extraCond += ` AND branch_id = $${idx++}`;
    }

    if (req.user?.role === 'hod' && req.user?.department_id && !departmentId) {
      params.push(req.user.department_id);
      extraCond += ` AND department_id = $${idx++}`;
    } else if (departmentId && departmentId !== 'all') {
      if (departmentId === 'none') {
        extraCond += ' AND department_id IS NULL';
      } else {
        params.push(departmentId);
        extraCond += ` AND department_id = $${idx++}`;
      }
    }

    const { rows } = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active' OR status = 'in_use') as active,
         COUNT(*) FILTER (WHERE condition = 'needs_repair') as needs_repair,
         COUNT(DISTINCT category) as categories,
         COALESCE(SUM(purchase_price * quantity), 0) as total_value
       FROM assets WHERE church_id = $1${extraCond}`,
      params
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get asset stats error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/assets
const getAssets = async (req, res) => {
  const { page = 1, limit = 20, search, category, status, condition, branchId, departmentId } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['a.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (search) {
      conditions.push(`(a.name ILIKE $${idx} OR a.asset_tag ILIKE $${idx} OR a.location ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) { conditions.push(`a.category = $${idx++}`); params.push(category); }
    if (status) { conditions.push(`a.status = $${idx++}`); params.push(status); }
    if (condition) { conditions.push(`a.condition = $${idx++}`); params.push(condition); }
    if (req.branchId) {
      idx = applyBranchFilter(req, 'a.branch_id', conditions, params, idx);
    } else if (branchId) {
      conditions.push(`a.branch_id = $${idx++}`); params.push(branchId);
    }

    // Department filtering & jurisdiction scoping
    if (req.user?.role === 'hod' && req.user?.department_id && !departmentId) {
      conditions.push(`a.department_id = $${idx++}`);
      params.push(req.user.department_id);
    } else if (departmentId && departmentId !== 'all') {
      if (departmentId === 'none') {
        conditions.push('a.department_id IS NULL');
      } else {
        conditions.push(`a.department_id = $${idx++}`);
        params.push(departmentId);
      }
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM assets a WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT a.*,
              b.name as branch_name,
              d.name as department_name,
              m.first_name || ' ' || m.last_name as custodian_name,
              m.phone as custodian_phone,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM assets a
       LEFT JOIN branches b ON b.id = a.branch_id
       LEFT JOIN departments d ON d.id = a.department_id
       LEFT JOIN members m ON m.id = a.custodian_id
       LEFT JOIN users u ON u.id = a.created_by
       WHERE ${where}
       ORDER BY a.category, a.name
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
        totalPages: Math.ceil(countRes.rows[0].count / limit),
      },
    });
  } catch (err) {
    logger.error('Get assets error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/assets/:id
const getAsset = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT a.*,
              b.name as branch_name,
              d.name as department_name,
              m.first_name || ' ' || m.last_name as custodian_name,
              m.phone as custodian_phone, m.email as custodian_email,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM assets a
       LEFT JOIN branches b ON b.id = a.branch_id
       LEFT JOIN departments d ON d.id = a.department_id
       LEFT JOIN members m ON m.id = a.custodian_id
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id = $1 AND a.church_id = $2`,
      [req.params.id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get asset error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/assets
const createAsset = async (req, res) => {
  const {
    name, description, category, assetTag, quantity, condition, status,
    purchaseDate, purchasePrice, currentValue, location, custodianId, branchId, notes,
    departmentId, photoUrl
  } = req.body;
  try {
    const finalBranchId = resolveWriteBranchId(req, branchId);
    const finalDeptId = departmentId || (req.user?.role === 'hod' ? req.user.department_id : null);
    const { rows } = await query(
      `INSERT INTO assets (id, church_id, branch_id, department_id, name, description, category, asset_tag,
        quantity, condition, status, purchase_date, purchase_price, current_value,
        location, custodian_id, notes, created_by, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        uuidv4(), req.churchId, finalBranchId, finalDeptId || null, name, description || null,
        category || 'general', assetTag || null, quantity || 1,
        condition || 'good', status || 'active',
        purchaseDate || null, purchasePrice || null, currentValue || null,
        location || null, custodianId || null, notes || null, req.user.id, photoUrl || null
      ]
    );
    logger.info('Asset created', { assetId: rows[0].id, name, departmentId: finalDeptId, userId: req.user.id });
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create asset error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/assets/:id
const updateAsset = async (req, res) => {
  const { id } = req.params;
  const {
    name, description, category, assetTag, quantity, condition, status,
    purchaseDate, purchasePrice, currentValue, location, custodianId, branchId, notes,
    departmentId, photoUrl
  } = req.body;
  try {
    const hasDept = departmentId !== undefined;
    const finalDept = departmentId || null;
    const { rows } = await query(
      `UPDATE assets SET
        name = COALESCE($3, name), description = COALESCE($4, description),
        category = COALESCE($5, category), asset_tag = COALESCE($6, asset_tag),
        quantity = COALESCE($7, quantity), condition = COALESCE($8, condition),
        status = COALESCE($9, status), purchase_date = COALESCE($10, purchase_date),
        purchase_price = COALESCE($11, purchase_price), current_value = COALESCE($12, current_value),
        location = COALESCE($13, location), custodian_id = $14,
        branch_id = $15, notes = COALESCE($16, notes),
        department_id = CASE WHEN $17 = true THEN $18::uuid ELSE department_id END,
        photo_url = COALESCE($19, photo_url),
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [
        id, req.churchId, name, description, category, assetTag,
        quantity, condition, status, purchaseDate, purchasePrice, currentValue,
        location, custodianId || null, branchId || null, notes,
        hasDept, finalDept, photoUrl
      ]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });
    logger.info('Asset updated', { assetId: id, userId: req.user.id });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update asset error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/assets/upload-photo
const uploadAssetPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    const photoUrl = `/uploads/media/${req.file.filename}`;
    return res.json({
      success: true,
      url: photoUrl,
      message: 'Photo uploaded successfully'
    });
  } catch (err) {
    logger.error('uploadAssetPhoto error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
};

// ── FACILITY INCIDENTS & WHISTLEBLOWER REPORTING ──────────────

// GET /api/assets/incidents/stats
const getIncidentStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'reported') as reported,
         COUNT(*) FILTER (WHERE status = 'investigating') as investigating,
         COUNT(*) FILTER (WHERE status = 'under_repair') as under_repair,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
         COUNT(*) FILTER (WHERE severity = 'critical' AND status != 'resolved') as active_critical
       FROM facility_incidents
       WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getIncidentStats error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading incident stats' });
  }
};

// GET /api/assets/incidents
const getIncidents = async (req, res) => {
  const { page = 1, limit = 20, status, severity, issueType, assetId, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = ['fi.church_id = $1'];
    const params = [req.churchId];
    let idx = 2;

    if (status && status !== 'all') {
      conditions.push(`fi.status = $${idx++}`);
      params.push(status);
    }
    if (severity && severity !== 'all') {
      conditions.push(`fi.severity = $${idx++}`);
      params.push(severity);
    }
    if (issueType && issueType !== 'all') {
      conditions.push(`fi.issue_type = $${idx++}`);
      params.push(issueType);
    }
    if (assetId) {
      conditions.push(`fi.asset_id = $${idx++}`);
      params.push(assetId);
    }
    if (search) {
      conditions.push(`(fi.title ILIKE $${idx} OR fi.facility_location ILIKE $${idx} OR fi.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM facility_incidents fi WHERE ${where}`, params);

    params.push(parseInt(limit, 10), offset);
    const { rows } = await query(
      `SELECT fi.*,
              a.name as asset_name, a.asset_tag, a.category as asset_category,
              u.first_name || ' ' || u.last_name as assigned_to_name
       FROM facility_incidents fi
       LEFT JOIN assets a ON a.id = fi.asset_id
       LEFT JOIN users u ON u.id = fi.assigned_to
       WHERE ${where}
       ORDER BY
         CASE WHEN fi.severity = 'critical' AND fi.status != 'resolved' THEN 1
              WHEN fi.status = 'reported' THEN 2
              WHEN fi.status = 'investigating' THEN 3
              WHEN fi.status = 'under_repair' THEN 4
              ELSE 5 END,
         fi.created_at DESC
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
    logger.error('getIncidents error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading incidents' });
  }
};

// POST /api/assets/incidents
// Whistleblower damage report
const reportIncident = async (req, res) => {
  const {
    assetId, facilityLocation, issueType = 'damage', severity = 'medium',
    title, description, photoUrl, isAnonymous = false, reporterName, reporterPhone
  } = req.body;

  if (!facilityLocation || !title || !description) {
    return res.status(400).json({ success: false, message: 'Facility location, title, and description are required' });
  }

  try {
    const finalReporterName = isAnonymous ? 'Anonymous Church Member' : (reporterName || (req.user ? `${req.user.first_name} ${req.user.last_name}` : 'Whistleblower Reporter'));
    const finalReporterUserId = isAnonymous ? null : (req.user?.id || null);

    const { rows } = await query(
      `INSERT INTO facility_incidents (
        id, church_id, branch_id, asset_id, facility_location,
        issue_type, severity, title, description, photo_url,
        is_anonymous, reporter_name, reporter_phone, reporter_user_id, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'reported')
      RETURNING *`,
      [
        uuidv4(), req.churchId, req.branchId || null, assetId || null, facilityLocation,
        issueType, severity, title, description, photoUrl || null,
        isAnonymous, finalReporterName, reporterPhone || null, finalReporterUserId
      ]
    );

    // If an asset was specified and severity is critical or damage, update asset condition
    if (assetId && (issueType === 'damage' || issueType === 'broken' || severity === 'critical')) {
      await query(
        `UPDATE assets SET condition = 'needs_repair', updated_at = NOW() WHERE id = $1 AND church_id = $2`,
        [assetId, req.churchId]
      );
    }

    logger.info('Facility whistleblower incident logged', { incidentId: rows[0].id, location: facilityLocation, severity });
    return res.status(201).json({
      success: true,
      data: rows[0],
      message: '🚨 Thank you! Facility damage report logged. Our facility maintenance team has been alerted.'
    });
  } catch (err) {
    logger.error('reportIncident error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error reporting incident' });
  }
};

// PATCH /api/assets/incidents/:id/status
const updateIncidentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, actionTaken, assignedTo } = req.body;

  const validStatuses = ['reported', 'investigating', 'under_repair', 'resolved', 'dismissed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid incident status' });
  }

  try {
    const resolvedClause = status === 'resolved' ? 'NOW()' : 'resolved_at';
    const { rows } = await query(
      `UPDATE facility_incidents SET
        status = COALESCE($3, status),
        action_taken = COALESCE($4, action_taken),
        assigned_to = COALESCE($5, assigned_to),
        resolved_at = ${resolvedClause},
        updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING *`,
      [id, req.churchId, status, actionTaken || null, assignedTo || null]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Incident report not found' });
    return res.json({ success: true, data: rows[0], message: 'Incident updated successfully' });
  } catch (err) {
    logger.error('updateIncidentStatus error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating incident' });
  }
};

// DELETE /api/assets/:id  (soft — sets status to 'disposed')
const deleteAsset = async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      `UPDATE assets SET status = 'disposed', updated_at = NOW() WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );
    return res.json({ success: true, message: 'Asset disposed' });
  } catch (err) {
    logger.error('Delete asset error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAssetStats,
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  uploadAssetPhoto,
  getIncidentStats,
  getIncidents,
  reportIncident,
  updateIncidentStatus,
};
