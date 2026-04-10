const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// GET /api/assets/stats
const getAssetStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active' OR status = 'in_use') as active,
         COUNT(*) FILTER (WHERE condition = 'needs_repair') as needs_repair,
         COUNT(DISTINCT category) as categories,
         COALESCE(SUM(purchase_price * quantity), 0) as total_value
       FROM assets WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get asset stats error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/assets
const getAssets = async (req, res) => {
  const { page = 1, limit = 20, search, category, status, condition, branchId } = req.query;
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
    if (branchId) { conditions.push(`a.branch_id = $${idx++}`); params.push(branchId); }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM assets a WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT a.*,
              b.name as branch_name,
              m.first_name || ' ' || m.last_name as custodian_name,
              m.phone as custodian_phone,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM assets a
       LEFT JOIN branches b ON b.id = a.branch_id
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
              m.first_name || ' ' || m.last_name as custodian_name,
              m.phone as custodian_phone, m.email as custodian_email,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM assets a
       LEFT JOIN branches b ON b.id = a.branch_id
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
    purchaseDate, purchasePrice, currentValue, location, custodianId, branchId, notes
  } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO assets (id, church_id, branch_id, name, description, category, asset_tag,
        quantity, condition, status, purchase_date, purchase_price, current_value,
        location, custodian_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        uuidv4(), req.churchId, branchId || null, name, description || null,
        category || 'general', assetTag || null, quantity || 1,
        condition || 'good', status || 'active',
        purchaseDate || null, purchasePrice || null, currentValue || null,
        location || null, custodianId || null, notes || null, req.user.id
      ]
    );
    logger.info('Asset created', { assetId: rows[0].id, name, userId: req.user.id });
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
    purchaseDate, purchasePrice, currentValue, location, custodianId, branchId, notes
  } = req.body;
  try {
    const { rows } = await query(
      `UPDATE assets SET
        name = COALESCE($3, name), description = COALESCE($4, description),
        category = COALESCE($5, category), asset_tag = COALESCE($6, asset_tag),
        quantity = COALESCE($7, quantity), condition = COALESCE($8, condition),
        status = COALESCE($9, status), purchase_date = COALESCE($10, purchase_date),
        purchase_price = COALESCE($11, purchase_price), current_value = COALESCE($12, current_value),
        location = COALESCE($13, location), custodian_id = $14,
        branch_id = $15, notes = COALESCE($16, notes), updated_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [
        id, req.churchId, name, description, category, assetTag,
        quantity, condition, status, purchaseDate, purchasePrice, currentValue,
        location, custodianId || null, branchId || null, notes
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

module.exports = { getAssetStats, getAssets, getAsset, createAsset, updateAsset, deleteAsset };
