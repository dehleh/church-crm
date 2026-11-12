const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { resolveWriteBranchId, applyBranchFilter } = require('../utils/branchScope');
const { syncBudgetSpend } = require('../utils/budgetSync');

const REVIEW_STATUSES = ['approved', 'disputed', 'correction', 'rejected'];
const ALLOWED_TRANSITIONS = {
  draft: ['draft', 'submitted'],
  submitted: ['submitted', 'approved', 'disputed', 'correction', 'rejected'],
  correction: ['correction', 'submitted', 'approved', 'disputed', 'rejected'],
  disputed: ['disputed', 'submitted', 'correction', 'approved', 'rejected'],
  approved: ['approved'],
  rejected: ['rejected'],
  disbursed: [],
};

// ── REQUISITIONS ────────────────────────────────────────────

const getRequisitions = async (req, res) => {
  const { page = 1, limit = 20, status, month } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['r.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    idx = applyBranchFilter(req, 'r.branch_id', conditions, params, idx);
    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
    if (month) { conditions.push(`r.requisition_month = $${idx++}`); params.push(month); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM requisitions r WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT r.*,
        u.first_name || ' ' || u.last_name as raised_by_name,
        a.first_name || ' ' || a.last_name as approved_by_name,
        dsp.first_name || ' ' || dsp.last_name as disputed_by_name,
        ret.first_name || ' ' || ret.last_name as returned_by_name,
        disb.first_name || ' ' || disb.last_name as disbursed_by_name,
        d.name as department_name
       FROM requisitions r
       LEFT JOIN users u ON u.id = r.raised_by
       LEFT JOIN users a ON a.id = r.approved_by
       LEFT JOIN users dsp ON dsp.id = r.disputed_by
       LEFT JOIN users ret ON ret.id = r.returned_by
       LEFT JOIN users disb ON disb.id = r.disbursed_by
       LEFT JOIN departments d ON d.id = r.department_id
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, params
    );
    return res.json({
      success: true, data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) }
    });
  } catch (err) {
    logger.error('getRequisitions error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createRequisition = async (req, res) => {
  const { title, description, requisitionMonth, departmentId, items, totalAmount, branchId, notes } = req.body;
  try {
    const finalBranchId = resolveWriteBranchId(req, branchId);
    const { rows } = await query(
      `INSERT INTO requisitions (id, church_id, branch_id, title, description, requisition_month, department_id, items, total_amount, raised_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuidv4(), req.churchId, finalBranchId, title, description || null, requisitionMonth, departmentId || null, JSON.stringify(items || []), totalAmount || 0, req.user.id, notes || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createRequisition error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRequisition = async (req, res) => {
  const { id } = req.params;
  const {
    status, items, totalAmount, notes, title, description,
    requisitionMonth, departmentId, disputeReason, correctionNotes, approvalNotes
  } = req.body;
  try {
    let checkConditions = ['id = $1', 'church_id = $2'];
    let checkParams = [id, req.churchId];
    applyBranchFilter(req, 'branch_id', checkConditions, checkParams, 3);

    const { rows: existingRows } = await query(
      `SELECT * FROM requisitions WHERE ${checkConditions.join(' AND ')}`,
      checkParams
    );
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    if (existing.status === 'disbursed') {
      return res.status(400).json({ success: false, message: 'Disbursed requisitions are locked and cannot be modified' });
    }

    if (status) {
      if (status === 'disbursed') {
        return res.status(400).json({ success: false, message: 'Use the disbursement endpoint to disburse funds' });
      }
      if (REVIEW_STATUSES.includes(status) && req.user?.role === 'hod' && !req.user?.is_super_admin) {
        return res.status(403).json({ success: false, message: 'HODs cannot approve, reject, dispute, or return requisitions' });
      }
      if (status === 'approved' && existing.raised_by === req.user?.id && !['head_pastor', 'admin', 'church_admin'].includes(req.user?.role) && !req.user?.is_super_admin) {
        return res.status(403).json({ success: false, message: 'You cannot approve your own requisition' });
      }
      const allowedNext = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status transition from '${existing.status}' to '${status}'` });
      }
    }

    if (existing.status === 'approved' && (items || totalAmount !== undefined || title)) {
      return res.status(400).json({ success: false, message: 'Approved requisition line items and amounts cannot be edited' });
    }

    const updates = [];
    const params = [id, req.churchId];
    let idx = 3;

    if (status) { updates.push(`status = $${idx++}`); params.push(status); }
    if (items) { updates.push(`items = $${idx++}`); params.push(JSON.stringify(items)); }
    if (totalAmount !== undefined) { updates.push(`total_amount = $${idx++}`); params.push(totalAmount); }
    if (notes !== undefined) { updates.push(`notes = $${idx++}`); params.push(notes); }
    if (title) { updates.push(`title = $${idx++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
    if (requisitionMonth) { updates.push(`requisition_month = $${idx++}`); params.push(requisitionMonth); }
    if (departmentId !== undefined) { updates.push(`department_id = $${idx++}`); params.push(departmentId || null); }

    if (status === 'approved') {
      updates.push(`approved_by = $${idx++}`); params.push(req.user.id);
      updates.push(`approved_at = NOW()`);
      if (approvalNotes || notes) {
        updates.push(`approval_notes = $${idx++}`); params.push(approvalNotes || notes);
      }
    } else if (status === 'disputed') {
      updates.push(`disputed_by = $${idx++}`); params.push(req.user.id);
      updates.push(`disputed_at = NOW()`);
      updates.push(`dispute_reason = $${idx++}`); params.push(disputeReason || notes || 'Disputed during review');
    } else if (status === 'correction') {
      updates.push(`returned_by = $${idx++}`); params.push(req.user.id);
      updates.push(`returned_at = NOW()`);
      updates.push(`correction_notes = $${idx++}`); params.push(correctionNotes || notes || 'Returned for correction');
    }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    const { rows } = await query(
      `UPDATE requisitions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 AND church_id = $2 RETURNING *`, params
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('updateRequisition error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PURCHASE REQUESTS ───────────────────────────────────────

const getPurchaseRequests = async (req, res) => {
  const { page = 1, limit = 20, status, priority } = req.query;
  const offset = (page - 1) * limit;
  try {
    let conditions = ['pr.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;
    idx = applyBranchFilter(req, 'pr.branch_id', conditions, params, idx);
    if (status) { conditions.push(`pr.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`pr.priority = $${idx++}`); params.push(priority); }
    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM purchase_requests pr WHERE ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT pr.*,
        u.first_name || ' ' || u.last_name as raised_by_name,
        rv.first_name || ' ' || rv.last_name as reviewed_by_name,
        req.title as requisition_title
       FROM purchase_requests pr
       LEFT JOIN users u ON u.id = pr.raised_by
       LEFT JOIN users rv ON rv.id = pr.reviewed_by
       LEFT JOIN requisitions req ON req.id = pr.requisition_id
       WHERE ${where}
       ORDER BY
         CASE pr.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
         pr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, params
    );
    return res.json({
      success: true, data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countRes.rows[0].count / limit) }
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const createPurchaseRequest = async (req, res) => {
  const { title, description, vendorName, items, totalAmount, priority, requisitionId, branchId } = req.body;
  try {
    const finalBranchId = resolveWriteBranchId(req, branchId);
    const { rows } = await query(
      `INSERT INTO purchase_requests (id, church_id, branch_id, requisition_id, title, description, vendor_name, items, total_amount, priority, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuidv4(), req.churchId, finalBranchId, requisitionId || null, title, description || null, vendorName || null, JSON.stringify(items || []), totalAmount || 0, priority || 'normal', req.user.id]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const reviewPurchaseRequest = async (req, res) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;
  if (req.user?.role === 'hod' && !req.user?.is_super_admin) {
    return res.status(403).json({ success: false, message: 'HODs cannot review purchase requests' });
  }
  try {
    let conditions = ['id = $1', 'church_id = $2'];
    let params = [id, req.churchId, status, reviewNotes, req.user.id];
    applyBranchFilter(req, 'branch_id', conditions, params, 6);

    const { rows } = await query(
      `UPDATE purchase_requests SET
        status = COALESCE($3, status),
        review_notes = COALESCE($4, review_notes),
        reviewed_by = $5,
        reviewed_at = NOW(),
        updated_at = NOW()
       WHERE ${conditions.join(' AND ')} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Purchase request not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

const disburseRequisition = async (req, res) => {
  const { id } = req.params;
  const { paymentMethod = 'paystack', amount, accountId, budgetId, beneficiary, notes, reference } = req.body;

  try {
    let findConditions = ['r.id = $1', 'r.church_id = $2'];
    let findParams = [id, req.churchId];
    applyBranchFilter(req, 'r.branch_id', findConditions, findParams, 3);

    const { rows: reqRows } = await query(
      `SELECT r.*, c.payment_settings, c.name as church_name, c.currency as church_currency
       FROM requisitions r
       JOIN churches c ON c.id = r.church_id
       WHERE ${findConditions.join(' AND ')}`,
      findParams
    );
    const requisition = reqRows[0];
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    if (requisition.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Only approved requisitions can be disbursed (current status: ${requisition.status})`,
      });
    }

    const disbursementAmount = Number(amount || requisition.total_amount || 0);
    if (!disbursementAmount || disbursementAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid disbursement amount' });
    }

    let paymentResult = null;
    let safeRef = reference || `DISB-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Execute transfer if paymentMethod is paystack
    if (paymentMethod === 'paystack' && beneficiary?.accountNumber && beneficiary?.bankCode) {
      const paymentService = require('../services/paymentService');
      paymentResult = await paymentService.initiateDisbursement({
        amount: disbursementAmount,
        accountNumber: beneficiary.accountNumber,
        bankCode: beneficiary.bankCode,
        accountName: beneficiary.accountName || 'Beneficiary',
        narration: notes || `Disbursement: ${requisition.title}`,
        reference: safeRef,
        churchSettings: requisition.payment_settings || {},
      });
      safeRef = paymentResult.reference || safeRef;
    }

    const txId = uuidv4();
    const details = {
      beneficiary: beneficiary || {},
      notes: notes || '',
      paymentMethod,
      paymentResult: paymentResult || { status: 'recorded_offline' },
      disbursedAt: new Date().toISOString(),
      disbursedBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
    };

    const client = await getClient();
    let updatedRequisition;
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO transactions (
          id, church_id, branch_id, account_id, transaction_type,
          amount, currency, description, reference, payment_method,
          transaction_date, recorded_by, approved_by, status, notes
        ) VALUES ($1,$2,$3,$4,'expense',$5,$6,$7,$8,$9,CURRENT_DATE,$10,$10,'completed',$11)`,
        [
          txId,
          req.churchId,
          requisition.branch_id || null,
          accountId || null,
          disbursementAmount,
          requisition.church_currency || 'NGN',
          `Requisition Disbursement: ${requisition.title}`,
          safeRef,
          paymentMethod,
          req.user.id,
          notes || `Disbursed to ${beneficiary?.accountName || 'beneficiary'}`
        ]
      );

      if (accountId) {
        const accRes = await client.query(
          `UPDATE finance_accounts
           SET balance = balance - $1, updated_at = NOW()
           WHERE id = $2 AND church_id = $3 RETURNING id`,
          [disbursementAmount, accountId, req.churchId]
        );
        if (!accRes.rows[0]) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Finance account not found in this church' });
        }
      }

      await syncBudgetSpend(client, {
        churchId: req.churchId,
        branchId: requisition.branch_id || null,
        amount: disbursementAmount,
        transactionDate: new Date(),
        budgetId: budgetId || null,
      });

      const { rows: updatedRows } = await client.query(
        `UPDATE requisitions SET
          status = 'disbursed',
          disbursed_by = $1,
          disbursed_at = NOW(),
          disbursement_amount = $2,
          disbursement_method = $3,
          disbursement_reference = $4,
          disbursement_details = $5,
          transaction_id = $6,
          updated_at = NOW()
         WHERE id = $7 AND church_id = $8 AND status = 'approved' RETURNING *`,
        [
          req.user.id,
          disbursementAmount,
          paymentMethod,
          safeRef,
          JSON.stringify(details),
          txId,
          id,
          req.churchId
        ]
      );
      if (!updatedRows[0]) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Requisition already processed' });
      }
      updatedRequisition = updatedRows[0];
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({
      success: true,
      data: updatedRequisition,
      transactionId: txId,
      reference: safeRef,
      message: 'Requisition funds disbursed successfully'
    });
  } catch (err) {
    logger.error('disburseRequisition failed:', { error: err.message });
    return res.status(500).json({ success: false, message: err.message || 'Server error processing disbursement' });
  }
};

const getBanks = async (req, res) => {
  try {
    const { rows: churchRows } = await query('SELECT payment_settings FROM churches WHERE id = $1', [req.churchId]);
    const paymentService = require('../services/paymentService');
    const banks = await paymentService.listBanks(churchRows[0]?.payment_settings || {});
    return res.json({ success: true, data: banks });
  } catch (err) {
    logger.error('getBanks failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error fetching bank list' });
  }
};

const resolveAccountName = async (req, res) => {
  const { accountNumber, bankCode } = req.query;
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ success: false, message: 'Account number and bank code required' });
  }
  try {
    const { rows: churchRows } = await query('SELECT payment_settings FROM churches WHERE id = $1', [req.churchId]);
    const paymentService = require('../services/paymentService');
    const result = await paymentService.resolveAccount({
      accountNumber,
      bankCode,
      churchSettings: churchRows[0]?.payment_settings || {},
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resolve account' });
  }
};

const getProcurementStats = async (req, res) => {
  try {
    const params = [req.churchId];
    let branchCond = '';
    if (req.branchId) {
      params.push(req.branchId);
      branchCond = ' AND branch_id = $2';
    }
    const { rows } = await query(
      `SELECT
        (SELECT COUNT(*) FROM requisitions WHERE church_id = $1${branchCond}) as total_requisitions,
        (SELECT COUNT(*) FROM requisitions WHERE church_id = $1${branchCond} AND status IN ('submitted', 'draft', 'correction', 'disputed')) as pending_requisitions,
        (SELECT COUNT(*) FROM requisitions WHERE church_id = $1${branchCond} AND status = 'approved') as approved_requisitions,
        (SELECT COUNT(*) FROM requisitions WHERE church_id = $1${branchCond} AND status = 'disbursed') as disbursed_requisitions,
        (SELECT COALESCE(SUM(disbursement_amount), 0) FROM requisitions WHERE church_id = $1${branchCond} AND status = 'disbursed') as disbursed_amount,
        (SELECT COUNT(*) FROM purchase_requests WHERE church_id = $1${branchCond}) as total_purchase_requests,
        (SELECT COUNT(*) FROM purchase_requests WHERE church_id = $1${branchCond} AND status = 'pending') as pending_tickets,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_requests WHERE church_id = $1${branchCond} AND status = 'approved') as approved_amount
      `, params
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('getProcurementStats error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getRequisitions,
  createRequisition,
  updateRequisition,
  disburseRequisition,
  getBanks,
  resolveAccountName,
  getPurchaseRequests,
  createPurchaseRequest,
  reviewPurchaseRequest,
  getProcurementStats
};
