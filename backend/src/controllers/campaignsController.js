const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { logChurchAudit } = require('../services/auditService');

// Helper to slugify a string
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// ── GET /api/campaigns ─────────────────────────────────────────
// List all giving campaigns with calculated amounts raised and progress
const listCampaigns = async (req, res) => {
  try {
    const { status, type, search, eventId } = req.query;
    let sql = `
      SELECT
        c.*,
        e.title as event_title,
        e.start_datetime as event_start_date,
        cat.name as category_name,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT SUM(og.amount) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS amount_raised,
        COALESCE((
          SELECT COUNT(DISTINCT COALESCE(t.member_id::text, t.description)) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT COUNT(DISTINCT COALESCE(og.donor_email, og.donor_name)) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS donors_count
      FROM giving_campaigns c
      LEFT JOIN events e ON e.id = c.event_id
      LEFT JOIN giving_categories cat ON cat.id = c.category_id
      WHERE c.church_id = $1
    `;
    const params = [req.churchId];

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    } else {
      // By default exclude archived
      sql += ` AND c.status != 'archived'`;
    }

    if (type) {
      params.push(type);
      sql += ` AND c.type = $${params.length}`;
    }

    if (eventId) {
      params.push(eventId);
      sql += ` AND c.event_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.title ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.scripture_text ILIKE $${params.length})`;
    }

    sql += ` ORDER BY c.is_featured DESC, c.created_at DESC`;

    const { rows } = await query(sql, params);

    // Format amounts and percentage
    const formatted = rows.map((c) => {
      const target = Number(c.target_amount || 0);
      const raised = Number(c.amount_raised || 0);
      const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
      return {
        ...c,
        target_amount: target,
        amount_raised: raised,
        donors_count: Number(c.donors_count || 0),
        progress_percent: pct,
      };
    });

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    logger.error('listCampaigns error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error loading campaigns' });
  }
};

// ── GET /api/campaigns/:id ─────────────────────────────────────
// Retrieve a single campaign with its recent contributions
const getCampaignById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: campaigns } = await query(
      `SELECT
        c.*,
        e.title as event_title,
        e.start_datetime as event_start_date,
        cat.name as category_name,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT SUM(og.amount) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS amount_raised,
        COALESCE((
          SELECT COUNT(DISTINCT COALESCE(t.member_id::text, t.description)) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT COUNT(DISTINCT COALESCE(og.donor_email, og.donor_name)) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS donors_count
       FROM giving_campaigns c
       LEFT JOIN events e ON e.id = c.event_id
       LEFT JOIN giving_categories cat ON cat.id = c.category_id
       WHERE c.id = $1 AND c.church_id = $2`,
      [id, req.churchId]
    );

    if (!campaigns[0]) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const target = Number(campaign.target_amount || 0);
    const raised = Number(campaign.amount_raised || 0);
    campaign.progress_percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

    // Fetch contributions
    const { rows: contributions } = await query(
      `SELECT id, donor_name, donor_email, amount, currency, created_at, 'online' as source, is_anonymous, notes
       FROM online_giving_transactions
       WHERE campaign_id = $1 AND status = 'successful'
       UNION ALL
       SELECT t.id, COALESCE(m.first_name || ' ' || m.last_name, t.description) as donor_name, m.email as donor_email, t.amount, t.currency, t.transaction_date as created_at, 'manual' as source, false as is_anonymous, t.notes
       FROM transactions t
       LEFT JOIN members m ON m.id = t.member_id
       WHERE t.campaign_id = $1 AND t.transaction_type = 'income' AND t.status = 'completed'
       ORDER BY created_at DESC LIMIT 50`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        campaign,
        contributions,
      },
    });
  } catch (err) {
    logger.error('getCampaignById error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/campaigns ────────────────────────────────────────
// Create a new campaign (Church Admin, Pastor, Finance)
const createCampaign = async (req, res) => {
  const {
    title,
    type = 'project',
    targetAmount = 0,
    currency = 'NGN',
    description,
    scriptureText,
    bannerUrl,
    startDate,
    endDate,
    eventId,
    categoryId,
    allowPublicDonations = true,
    allowMemberPortal = true,
    isFeatured = false,
    status = 'active',
  } = req.body;

  try {
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Campaign title is required' });
    }

    // Generate unique slug
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `campaign-${Date.now()}`;
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const { rows } = await query(
        `SELECT id FROM giving_campaigns WHERE church_id = $1 AND slug = $2`,
        [req.churchId, finalSlug]
      );
      if (rows.length === 0) break;
      finalSlug = `${baseSlug}-${counter++}`;
    }

    // Auto-create category if categoryId not supplied but title exists
    let resolvedCatId = categoryId || null;
    if (!resolvedCatId) {
      const { rows: existingCats } = await query(
        `SELECT id FROM giving_categories WHERE church_id = $1 AND LOWER(name) = LOWER($2)`,
        [req.churchId, title.trim()]
      );
      if (existingCats[0]) {
        resolvedCatId = existingCats[0].id;
      } else {
        const { rows: newCat } = await query(
          `INSERT INTO giving_categories (id, church_id, name, description)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [uuidv4(), req.churchId, title.trim(), `Auto category for ${type}: ${title.trim()}`]
        );
        resolvedCatId = newCat[0]?.id;
      }
    }

    const campaignId = uuidv4();
    const { rows } = await query(
      `INSERT INTO giving_campaigns (
        id, church_id, branch_id, event_id, category_id,
        title, slug, type, description, scripture_text,
        target_amount, currency, banner_url, start_date, end_date,
        status, allow_public_donations, allow_member_portal, is_featured, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        campaignId,
        req.churchId,
        req.branchId || null,
        eventId || null,
        resolvedCatId,
        title.trim(),
        finalSlug,
        type,
        description || null,
        scriptureText || null,
        Number(targetAmount || 0),
        currency,
        bannerUrl || null,
        startDate || new Date().toISOString().slice(0, 10),
        endDate || null,
        status,
        Boolean(allowPublicDonations),
        Boolean(allowMemberPortal),
        Boolean(isFeatured),
        req.user?.id || null,
      ]
    );

    await logChurchAudit({
      churchId: req.churchId,
      action: 'CREATE_GIVING_CAMPAIGN',
      resourceType: 'giving_campaign',
      resourceId: campaignId,
      details: { title, targetAmount, type },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Giving campaign created successfully',
      data: rows[0],
    });
  } catch (err) {
    logger.error('createCampaign error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
};

// ── PUT /api/campaigns/:id ─────────────────────────────────────
// Update an existing campaign
const updateCampaign = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    type,
    targetAmount,
    currency,
    description,
    scriptureText,
    bannerUrl,
    startDate,
    endDate,
    eventId,
    categoryId,
    allowPublicDonations,
    allowMemberPortal,
    isFeatured,
    status,
  } = req.body;

  try {
    const { rows: existing } = await query(
      `SELECT * FROM giving_campaigns WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );

    if (!existing[0]) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const current = existing[0];
    const { rows } = await query(
      `UPDATE giving_campaigns
       SET title = COALESCE($1, title),
           type = COALESCE($2, type),
           target_amount = COALESCE($3, target_amount),
           currency = COALESCE($4, currency),
           description = COALESCE($5, description),
           scripture_text = COALESCE($6, scripture_text),
           banner_url = COALESCE($7, banner_url),
           start_date = COALESCE($8, start_date),
           end_date = COALESCE($9, end_date),
           event_id = $10,
           category_id = COALESCE($11, category_id),
           allow_public_donations = COALESCE($12, allow_public_donations),
           allow_member_portal = COALESCE($13, allow_member_portal),
           is_featured = COALESCE($14, is_featured),
           status = COALESCE($15, status),
           updated_at = NOW()
       WHERE id = $16 AND church_id = $17
       RETURNING *`,
      [
        title ? title.trim() : null,
        type || null,
        targetAmount !== undefined ? Number(targetAmount) : null,
        currency || null,
        description !== undefined ? description : null,
        scriptureText !== undefined ? scriptureText : null,
        bannerUrl !== undefined ? bannerUrl : null,
        startDate || null,
        endDate !== undefined ? endDate : null,
        eventId !== undefined ? (eventId || null) : current.event_id,
        categoryId || null,
        allowPublicDonations !== undefined ? Boolean(allowPublicDonations) : null,
        allowMemberPortal !== undefined ? Boolean(allowMemberPortal) : null,
        isFeatured !== undefined ? Boolean(isFeatured) : null,
        status || null,
        id,
        req.churchId,
      ]
    );

    await logChurchAudit({
      churchId: req.churchId,
      action: 'UPDATE_GIVING_CAMPAIGN',
      resourceType: 'giving_campaign',
      resourceId: id,
      details: { title: rows[0].title, status: rows[0].status },
      req,
    });

    return res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: rows[0],
    });
  } catch (err) {
    logger.error('updateCampaign error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to update campaign' });
  }
};

// ── DELETE /api/campaigns/:id ──────────────────────────────────
// Soft delete / archive a campaign
const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `UPDATE giving_campaigns
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING id, title`,
      [id, req.churchId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    await logChurchAudit({
      churchId: req.churchId,
      action: 'ARCHIVE_GIVING_CAMPAIGN',
      resourceType: 'giving_campaign',
      resourceId: id,
      details: { title: rows[0].title },
      req,
    });

    return res.json({
      success: true,
      message: 'Campaign archived successfully',
    });
  } catch (err) {
    logger.error('deleteCampaign error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
};

// ── POST /api/campaigns/:id/record-donation ────────────────────
// Record manual offline donation directly to this campaign
const recordManualDonation = async (req, res) => {
  const { id } = req.params;
  const {
    amount,
    donorName,
    memberId,
    paymentMethod = 'cash',
    transactionDate,
    notes,
  } = req.body;

  try {
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const { rows: campaigns } = await query(
      `SELECT * FROM giving_campaigns WHERE id = $1 AND church_id = $2`,
      [id, req.churchId]
    );

    if (!campaigns[0]) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const txId = uuidv4();
    const reference = `MAN-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    await query(
      `INSERT INTO transactions (
        id, church_id, branch_id, category_id, campaign_id,
        member_id, transaction_type, amount, currency,
        description, reference, payment_method, transaction_date,
        recorded_by, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, 'income', $7, $8, $9, $10, $11, $12, $13, 'completed', $14)`,
      [
        txId,
        req.churchId,
        req.branchId || campaign.branch_id || null,
        campaign.category_id || null,
        id,
        memberId || null,
        Number(amount),
        campaign.currency || 'NGN',
        `Campaign Giving (${campaign.title}) - ${donorName || 'Anonymous Giver'}`,
        reference,
        paymentMethod,
        transactionDate || new Date().toISOString().slice(0, 10),
        req.user?.id || null,
        notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Donation recorded successfully',
      data: {
        transactionId: txId,
        reference,
        amount: Number(amount),
      },
    });
  } catch (err) {
    logger.error('recordManualDonation error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
};

// ── GET /api/campaigns/public/:churchSlug ──────────────────────
// Public list of active campaigns for public giving page
const getPublicCampaigns = async (req, res) => {
  const { churchSlug } = req.params;
  try {
    const { rows: churches } = await query(
      `SELECT id, name, slug, logo_url, currency FROM churches WHERE LOWER(slug) = LOWER($1) AND is_active = true`,
      [churchSlug]
    );

    if (!churches[0]) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const church = churches[0];
    const { rows } = await query(
      `SELECT
        c.id, c.title, c.slug, c.type, c.description, c.scripture_text,
        c.target_amount, c.currency, c.banner_url, c.start_date, c.end_date,
        c.is_featured,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT SUM(og.amount) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS amount_raised,
        COALESCE((
          SELECT COUNT(DISTINCT COALESCE(t.member_id::text, t.description)) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT COUNT(DISTINCT COALESCE(og.donor_email, og.donor_name)) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS donors_count
       FROM giving_campaigns c
       WHERE c.church_id = $1 AND c.status = 'active' AND c.allow_public_donations = true
       ORDER BY c.is_featured DESC, c.created_at DESC`,
      [church.id]
    );

    const formatted = rows.map((c) => {
      const target = Number(c.target_amount || 0);
      const raised = Number(c.amount_raised || 0);
      return {
        ...c,
        target_amount: target,
        amount_raised: raised,
        donors_count: Number(c.donors_count || 0),
        progress_percent: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
      };
    });

    return res.json({
      success: true,
      data: {
        church,
        campaigns: formatted,
      },
    });
  } catch (err) {
    logger.error('getPublicCampaigns error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/campaigns/public/:churchSlug/:campaignSlug ────────
// Public detail of a specific campaign
const getPublicCampaignBySlug = async (req, res) => {
  const { churchSlug, campaignSlug } = req.params;
  try {
    const { rows: churches } = await query(
      `SELECT id, name, slug, logo_url, banner_url, currency, payment_settings, settings
       FROM churches WHERE LOWER(slug) = LOWER($1) AND is_active = true`,
      [churchSlug]
    );

    if (!churches[0]) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }

    const church = churches[0];
    const { rows: campaigns } = await query(
      `SELECT
        c.id, c.title, c.slug, c.type, c.description, c.scripture_text,
        c.target_amount, c.currency, c.banner_url, c.start_date, c.end_date,
        c.is_featured, c.status,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT SUM(og.amount) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS amount_raised,
        COALESCE((
          SELECT COUNT(DISTINCT COALESCE(t.member_id::text, t.description)) FROM transactions t
          WHERE t.campaign_id = c.id AND t.transaction_type = 'income' AND t.status = 'completed'
        ), 0) + COALESCE((
          SELECT COUNT(DISTINCT COALESCE(og.donor_email, og.donor_name)) FROM online_giving_transactions og
          WHERE og.campaign_id = c.id AND og.status = 'successful'
        ), 0) AS donors_count
       FROM giving_campaigns c
       WHERE c.church_id = $1 AND LOWER(c.slug) = LOWER($2) AND c.status = 'active'`,
      [church.id, campaignSlug]
    );

    if (!campaigns[0]) {
      return res.status(404).json({ success: false, message: 'Campaign not found or no longer active' });
    }

    const campaign = campaigns[0];
    const target = Number(campaign.target_amount || 0);
    const raised = Number(campaign.amount_raised || 0);
    campaign.progress_percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

    return res.json({
      success: true,
      data: {
        church: {
          id: church.id,
          name: church.name,
          slug: church.slug,
          logoUrl: church.logo_url,
          currency: church.currency,
          settings: church.settings || {},
        },
        campaign,
      },
    });
  } catch (err) {
    logger.error('getPublicCampaignBySlug error:', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  recordManualDonation,
  getPublicCampaigns,
  getPublicCampaignBySlug,
};
