const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { PLAN_CODES } = require('../services/plans');

// POST /api/license/request  (PUBLIC)
const submitLicenseRequest = async (req, res) => {
  const {
    churchName, contactName, adminEmail, phone, country,
    plan, branchesEstimate, membersEstimate, message,
  } = req.body;

  try {
    if (!churchName || !contactName || !adminEmail || !plan) {
      return res.status(400).json({ success: false, message: 'churchName, contactName, adminEmail and plan are required' });
    }
    if (!PLAN_CODES.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO license_requests
        (id, church_name, contact_name, admin_email, phone, country, plan,
         branches_estimate, members_estimate, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id, churchName, contactName, adminEmail, phone || null, country || null, plan,
        branchesEstimate || null, membersEstimate || null, message || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thanks! We have received your request. Our team will reach out within 1 business day.',
      data: { id }
    });
  } catch (err) {
    logger.error('License request error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/platform/license-requests  (super admin)
const listLicenseRequests = async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = []; const params = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  const wsql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const { rows } = await query(
      `SELECT id, church_name, contact_name, admin_email, phone, country, plan,
              branches_estimate, members_estimate, message, status, notes,
              processed_by, processed_at, created_at
       FROM license_requests
       ${wsql}
       ORDER BY created_at DESC
       LIMIT ${parseInt(limit, 10)} OFFSET ${offset}`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('List license requests', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/platform/license-requests/:id  (super admin)
const updateLicenseRequest = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const allowed = ['pending', 'contacted', 'approved', 'rejected'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const sets = []; const params = [];
    if (status) { params.push(status); sets.push(`status = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); sets.push(`notes = $${params.length}`); }
    if (status) {
      params.push(req.user.id); sets.push(`processed_by = $${params.length}`);
      sets.push(`processed_at = NOW()`);
    }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No changes' });
    params.push(id);
    const { rows } = await query(
      `UPDATE license_requests SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update license request', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { submitLicenseRequest, listLicenseRequests, updateLicenseRequest };
