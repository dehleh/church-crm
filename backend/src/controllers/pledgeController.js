const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * POST /api/pledges
 * Create a new campaign pledge (Staff or Portal)
 */
const createPledge = async (req, res) => {
  const {
    campaignId,
    memberId,
    donorName,
    donorEmail,
    donorPhone,
    pledgeAmount,
    currency = 'NGN',
    frequency = 'one_time',
    startDate,
    endDate,
    notes,
  } = req.body;

  if (!campaignId || !pledgeAmount || Number(pledgeAmount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid campaign ID and positive pledge amount are required' });
  }

  try {
    // Validate campaign exists and belongs to church
    const { rows: campRows } = await query(
      `SELECT id, title, currency FROM giving_campaigns WHERE id = $1 AND church_id = $2`,
      [campaignId, req.churchId]
    );
    if (!campRows[0]) {
      return res.status(404).json({ success: false, message: 'Giving campaign not found' });
    }

    const finalMemberId = req.member?.id || memberId || null;
    let finalDonorName = donorName ? donorName.trim() : null;
    let finalDonorEmail = donorEmail ? donorEmail.trim() : null;
    let finalDonorPhone = donorPhone ? donorPhone.trim() : null;

    if (finalMemberId && (!finalDonorName || !finalDonorEmail)) {
      const { rows: memRows } = await query(
        `SELECT first_name, last_name, email, phone FROM members WHERE id = $1 AND church_id = $2`,
        [finalMemberId, req.churchId]
      );
      if (memRows[0]) {
        if (!finalDonorName) finalDonorName = `${memRows[0].first_name} ${memRows[0].last_name}`;
        if (!finalDonorEmail) finalDonorEmail = memRows[0].email;
        if (!finalDonorPhone) finalDonorPhone = memRows[0].phone;
      }
    }

    if (!finalDonorName) {
      return res.status(400).json({ success: false, message: 'Donor name is required' });
    }

    const id = uuidv4();
    const finalCurrency = currency || campRows[0].currency || 'NGN';

    const { rows } = await query(
      `INSERT INTO campaign_pledges (
        id, church_id, campaign_id, member_id, donor_name, donor_email, donor_phone,
        pledge_amount, amount_fulfilled, currency, frequency, start_date, end_date,
        status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0.00,$9,$10,$11,$12,'active',$13)
      RETURNING *`,
      [
        id,
        req.churchId,
        campaignId,
        finalMemberId,
        finalDonorName,
        finalDonorEmail,
        finalDonorPhone,
        parseFloat(pledgeAmount),
        finalCurrency,
        frequency,
        startDate || new Date().toISOString().split('T')[0],
        endDate || null,
        notes || null,
      ]
    );

    logger.info('Campaign pledge registered', {
      pledgeId: id,
      campaignId,
      amount: pledgeAmount,
      churchId: req.churchId,
    });

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Faith pledge committed successfully',
    });
  } catch (err) {
    logger.error('createPledge error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error registering pledge' });
  }
};

/**
 * GET /api/pledges
 * List pledges for campaign with totals
 */
const getCampaignPledges = async (req, res) => {
  const { campaignId, status, page = 1, limit = 50 } = req.query;

  if (!campaignId) {
    return res.status(400).json({ success: false, message: 'campaignId is required' });
  }

  try {
    const conditions = ['p.church_id = $1', 'p.campaign_id = $2'];
    const params = [req.churchId, campaignId];
    let idx = 3;

    if (status && status !== 'all') {
      conditions.push(`p.status = $${idx++}`);
      params.push(status);
    }

    const { rows: pledges } = await query(
      `SELECT p.*,
              m.first_name, m.last_name, m.avatar_url, m.member_number,
              c.title as campaign_title
       FROM campaign_pledges p
       JOIN giving_campaigns c ON c.id = p.campaign_id
       LEFT JOIN members m ON m.id = p.member_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    );

    const totalPledged = pledges.reduce((sum, p) => sum + Number(p.pledge_amount || 0), 0);
    const totalFulfilled = pledges.reduce((sum, p) => sum + Number(p.amount_fulfilled || 0), 0);
    const fulfillmentRate = totalPledged > 0 ? Math.round((totalFulfilled / totalPledged) * 100) : 0;

    return res.json({
      success: true,
      data: pledges,
      aggregates: {
        totalPledged,
        totalFulfilled,
        fulfillmentRate,
        totalCount: pledges.length,
      },
    });
  } catch (err) {
    logger.error('getCampaignPledges error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/pledges/:id/fulfill
 * Record partial or full redemption toward pledge
 */
const fulfillPledge = async (req, res) => {
  const { id } = req.params;
  const { amount, notes } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
  }

  try {
    const { rows: pledgeRows } = await query(
      `SELECT * FROM campaign_pledges WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );
    const pledge = pledgeRows[0];
    if (!pledge) {
      return res.status(404).json({ success: false, message: 'Pledge record not found' });
    }

    const payment = parseFloat(amount);
    const newFulfilled = Number(pledge.amount_fulfilled || 0) + payment;
    const isCompleted = newFulfilled >= Number(pledge.pledge_amount);
    const newStatus = isCompleted ? 'fulfilled' : 'active';

    const appendNote = notes ? `${pledge.notes ? pledge.notes + ' | ' : ''}Redeemed ${pledge.currency} ${payment} on ${new Date().toISOString().split('T')[0]}: ${notes}` : pledge.notes;

    const { rows } = await query(
      `UPDATE campaign_pledges
       SET amount_fulfilled = $1,
           status = $2,
           notes = $3,
           updated_at = NOW()
       WHERE id = $4 AND church_id = $5
       RETURNING *`,
      [newFulfilled, newStatus, appendNote, id, req.churchId]
    );

    return res.json({
      success: true,
      data: rows[0],
      message: `Pledge updated. Fulfilled: ${pledge.currency} ${newFulfilled.toLocaleString()} / ${pledge.currency} ${Number(pledge.pledge_amount).toLocaleString()}`,
    });
  } catch (err) {
    logger.error('fulfillPledge error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error updating pledge' });
  }
};

/**
 * GET /api/pledges/my
 * Portal member retrieving their own faith commitments
 */
const getMyPledges = async (req, res) => {
  const memberId = req.member?.id;
  if (!memberId) {
    return res.status(401).json({ success: false, message: 'Member authentication required' });
  }

  try {
    const { rows } = await query(
      `SELECT p.*,
              c.title as campaign_title,
              c.banner_url as campaign_banner,
              c.end_date as campaign_end_date,
              c.status as campaign_status
       FROM campaign_pledges p
       JOIN giving_campaigns c ON c.id = p.campaign_id
       WHERE p.church_id = $1 AND p.member_id = $2
       ORDER BY p.created_at DESC`,
      [req.churchId, memberId]
    );

    const totalPledged = rows.reduce((s, p) => s + Number(p.pledge_amount || 0), 0);
    const totalFulfilled = rows.reduce((s, p) => s + Number(p.amount_fulfilled || 0), 0);

    return res.json({
      success: true,
      data: rows,
      aggregates: {
        totalPledged,
        totalFulfilled,
        count: rows.length,
      },
    });
  } catch (err) {
    logger.error('getMyPledges error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createPledge,
  getCampaignPledges,
  fulfillPledge,
  getMyPledges,
};
