const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { enqueue, registerProcessor } = require('../queue');

// ── Helpers ──────────────────────────────────────────────────
const sanitize = (v) => (typeof v === 'string' ? v.trim() : v);
const nullable = (v) => (v === '' || v === undefined || v === null ? null : v);

const MAX_ROWS = 5000; // higher cap now that imports run async
const PROGRESS_EVERY = 25;

// Run a per-row insert using SAVEPOINTs so one bad row doesn't poison the whole batch.
const processBatch = async (rows, runRow, { updateProgress } = {}) => {
  const results = { imported: 0, skipped: 0, errors: [] };
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const sp = `sp_${i}`;
      try {
        await client.query(`SAVEPOINT ${sp}`);
        await runRow(client, r, i);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
        results.imported++;
      } catch (err) {
        try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch { /* ignore */ }
        results.errors.push({ row: i + 1, message: (err.message || String(err)).slice(0, 200) });
        results.skipped++;
      }
      if (updateProgress && (i % PROGRESS_EVERY === 0 || i === rows.length - 1)) {
        updateProgress(Math.round(((i + 1) / rows.length) * 100));
      }
    }
    await client.query('COMMIT');
    return results;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    logger.error('csv import batch failed', { err: err.message });
    throw err;
  } finally {
    client.release();
  }
};

// ── Processors ──────────────────────────────────────────────

registerProcessor('csv-members', async ({ churchId, rows }, ctx) => {
  const countRes = await query('SELECT COUNT(*) FROM members WHERE church_id = $1', [churchId]);
  let memberSeq = parseInt(countRes.rows[0].count, 10);
  return processBatch(rows, async (client, r) => {
    const firstName = sanitize(r.firstName || r.first_name || r.FirstName || '');
    const lastName = sanitize(r.lastName || r.last_name || r.LastName || '');
    if (!firstName || !lastName) throw new Error('First name and last name are required');
    memberSeq++;
    const memberNumber = `MBR-${String(memberSeq).padStart(5, '0')}`;
    await client.query(
      `INSERT INTO members (
        id, church_id, member_number, first_name, last_name, middle_name,
        email, phone, phone_alt, date_of_birth, gender, marital_status,
        address, city, state, country, occupation, employer,
        membership_class, join_date, water_baptized, holy_ghost_baptized,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      [
        uuidv4(), churchId, memberNumber, firstName, lastName,
        nullable(r.middleName || r.middle_name || r.MiddleName),
        nullable(r.email || r.Email),
        nullable(r.phone || r.Phone),
        nullable(r.phoneAlt || r.phone_alt || r.PhoneAlt),
        nullable(r.dateOfBirth || r.date_of_birth || r.DateOfBirth || r.dob || r.DOB),
        nullable((r.gender || r.Gender || '').toLowerCase()) || null,
        nullable(r.maritalStatus || r.marital_status || r.MaritalStatus),
        nullable(r.address || r.Address),
        nullable(r.city || r.City),
        nullable(r.state || r.State),
        nullable(r.country || r.Country),
        nullable(r.occupation || r.Occupation),
        nullable(r.employer || r.Employer),
        nullable(r.membershipClass || r.membership_class || r.MembershipClass) || 'full',
        nullable(r.joinDate || r.join_date || r.JoinDate),
        ['true', 'yes', '1'].includes((r.waterBaptized || r.water_baptized || '').toString().toLowerCase()),
        ['true', 'yes', '1'].includes((r.holyGhostBaptized || r.holy_ghost_baptized || '').toString().toLowerCase()),
        nullable(r.nextOfKinName || r.next_of_kin_name),
        nullable(r.nextOfKinPhone || r.next_of_kin_phone),
        nullable(r.nextOfKinRelationship || r.next_of_kin_relationship),
        nullable(r.notes || r.Notes),
      ]
    );
  }, ctx);
});

registerProcessor('csv-first-timers', async ({ churchId, rows }, ctx) => {
  return processBatch(rows, async (client, r) => {
    const firstName = sanitize(r.firstName || r.first_name || r.FirstName || '');
    const lastName = sanitize(r.lastName || r.last_name || r.LastName || '');
    if (!firstName || !lastName) throw new Error('First name and last name are required');
    await client.query(
      `INSERT INTO first_timers (
        id, church_id, first_name, last_name, email, phone, address,
        gender, date_of_birth, how_did_you_hear, visit_date, service_attended, prayer_request
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        uuidv4(), churchId, firstName, lastName,
        nullable(r.email || r.Email),
        nullable(r.phone || r.Phone),
        nullable(r.address || r.Address),
        nullable((r.gender || r.Gender || '').toLowerCase()) || null,
        nullable(r.dateOfBirth || r.date_of_birth || r.DOB),
        nullable(r.howDidYouHear || r.how_did_you_hear || r.HowDidYouHear || r.source || r.Source),
        nullable(r.visitDate || r.visit_date || r.VisitDate) || new Date().toISOString().split('T')[0],
        nullable(r.serviceAttended || r.service_attended || r.ServiceAttended),
        nullable(r.prayerRequest || r.prayer_request || r.PrayerRequest),
      ]
    );
  }, ctx);
});

registerProcessor('csv-transactions', async ({ churchId, userId, rows }, ctx) => {
  const catRes = await query('SELECT id, LOWER(name) as name FROM giving_categories WHERE church_id = $1', [churchId]);
  const catMap = {};
  catRes.rows.forEach(c => { catMap[c.name] = c.id; });
  return processBatch(rows, async (client, r, i) => {
    const type = (r.transactionType || r.transaction_type || r.type || r.Type || '').toLowerCase();
    const amount = parseFloat(r.amount || r.Amount || 0);
    if (!['income', 'expense'].includes(type)) throw new Error('Type must be "income" or "expense"');
    if (!amount || amount <= 0) throw new Error('Amount must be greater than 0');
    let categoryId = nullable(r.categoryId || r.category_id);
    const categoryName = (r.category || r.Category || r.categoryName || '').trim().toLowerCase();
    if (!categoryId && categoryName && catMap[categoryName]) categoryId = catMap[categoryName];
    const reference = `TXN-IMP-${Date.now()}-${i}`;
    await client.query(
      `INSERT INTO transactions (
        id, church_id, transaction_type, amount, description, reference,
        payment_method, transaction_date, category_id, recorded_by, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        uuidv4(), churchId, type, amount,
        nullable(r.description || r.Description),
        reference,
        nullable((r.paymentMethod || r.payment_method || r.PaymentMethod || '').toLowerCase()) || null,
        nullable(r.transactionDate || r.transaction_date || r.date || r.Date) || new Date().toISOString().split('T')[0],
        categoryId,
        userId,
        nullable(r.notes || r.Notes),
      ]
    );
  }, ctx);
});

registerProcessor('csv-requisitions', async ({ churchId, userId, rows }, ctx) => {
  return processBatch(rows, async (client, r) => {
    const title = sanitize(r.title || r.Title || '');
    if (!title) throw new Error('Title is required');
    const month = nullable(r.requisitionMonth || r.requisition_month || r.month || r.Month);
    if (!month) throw new Error('Requisition month is required');
    const totalAmount = parseFloat(r.totalAmount || r.total_amount || r.amount || r.Amount || 0);
    await client.query(
      `INSERT INTO requisitions (id, church_id, title, description, requisition_month, total_amount, items, raised_by, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        uuidv4(), churchId, title,
        nullable(r.description || r.Description),
        month, totalAmount,
        JSON.stringify([]),
        userId,
        nullable(r.notes || r.Notes),
        'draft',
      ]
    );
  }, ctx);
});

registerProcessor('csv-purchase-requests', async ({ churchId, userId, rows }, ctx) => {
  return processBatch(rows, async (client, r) => {
    const title = sanitize(r.title || r.Title || '');
    if (!title) throw new Error('Title is required');
    const totalAmount = parseFloat(r.totalAmount || r.total_amount || r.amount || r.Amount || 0);
    if (!totalAmount || totalAmount <= 0) throw new Error('Amount must be greater than 0');
    const priority = (r.priority || r.Priority || 'normal').toLowerCase();
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      throw new Error('Priority must be low, normal, high, or urgent');
    }
    await client.query(
      `INSERT INTO purchase_requests (id, church_id, title, description, vendor_name, total_amount, priority, items, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(), churchId, title,
        nullable(r.description || r.Description),
        nullable(r.vendorName || r.vendor_name || r.vendor || r.Vendor),
        totalAmount, priority,
        JSON.stringify([]),
        userId,
      ]
    );
  }, ctx);
});

// ── HTTP handlers — enqueue and return job id ─────────────────

const validateRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return 'No rows provided';
  if (rows.length > MAX_ROWS) return `Maximum ${MAX_ROWS} rows per import`;
  return null;
};

const enqueueImport = (jobName) => async (req, res) => {
  const { rows } = req.body;
  const err = validateRows(rows);
  if (err) return res.status(400).json({ success: false, message: err });
  try {
    const job = await enqueue(jobName, {
      churchId: req.churchId,
      userId: req.user.id,
      rows,
    });
    return res.status(202).json({
      success: true,
      data: { jobId: job.id, backend: job.backend, total: rows.length },
    });
  } catch (e) {
    logger.error('failed to enqueue csv import', { jobName, err: e.message });
    return res.status(500).json({ success: false, message: 'Failed to enqueue job' });
  }
};

module.exports = {
  importMembers: enqueueImport('csv-members'),
  importFirstTimers: enqueueImport('csv-first-timers'),
  importTransactions: enqueueImport('csv-transactions'),
  importRequisitions: enqueueImport('csv-requisitions'),
  importPurchaseRequests: enqueueImport('csv-purchase-requests'),
};
