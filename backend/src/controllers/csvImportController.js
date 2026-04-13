const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// ── Helpers ──────────────────────────────────────────────────
const sanitize = (v) => (typeof v === 'string' ? v.trim() : v);
const nullable = (v) => (v === '' || v === undefined || v === null ? null : v);

// ── Members CSV Import ──────────────────────────────────────
const importMembers = async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows provided' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
  }

  const churchId = req.churchId;
  const results = { imported: 0, skipped: 0, errors: [] };

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get current member count for numbering
    const countRes = await client.query('SELECT COUNT(*) FROM members WHERE church_id = $1', [churchId]);
    let memberSeq = parseInt(countRes.rows[0].count);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const firstName = sanitize(r.firstName || r.first_name || r.FirstName || '');
      const lastName = sanitize(r.lastName || r.last_name || r.LastName || '');

      if (!firstName || !lastName) {
        results.errors.push({ row: i + 1, message: 'First name and last name are required' });
        results.skipped++;
        continue;
      }

      try {
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
            (r.waterBaptized || r.water_baptized || '').toString().toLowerCase() === 'true' || (r.waterBaptized || r.water_baptized || '').toString().toLowerCase() === 'yes',
            (r.holyGhostBaptized || r.holy_ghost_baptized || '').toString().toLowerCase() === 'true' || (r.holyGhostBaptized || r.holy_ghost_baptized || '').toString().toLowerCase() === 'yes',
            nullable(r.nextOfKinName || r.next_of_kin_name),
            nullable(r.nextOfKinPhone || r.next_of_kin_phone),
            nullable(r.nextOfKinRelationship || r.next_of_kin_relationship),
            nullable(r.notes || r.Notes)
          ]
        );
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i + 1, message: err.message.slice(0, 120) });
        results.skipped++;
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CSV member import failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  } finally {
    client.release();
  }
};

// ── First Timers CSV Import ─────────────────────────────────
const importFirstTimers = async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows provided' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
  }

  const churchId = req.churchId;
  const results = { imported: 0, skipped: 0, errors: [] };

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const firstName = sanitize(r.firstName || r.first_name || r.FirstName || '');
      const lastName = sanitize(r.lastName || r.last_name || r.LastName || '');

      if (!firstName || !lastName) {
        results.errors.push({ row: i + 1, message: 'First name and last name are required' });
        results.skipped++;
        continue;
      }

      try {
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
            nullable(r.prayerRequest || r.prayer_request || r.PrayerRequest)
          ]
        );
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i + 1, message: err.message.slice(0, 120) });
        results.skipped++;
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CSV first-timer import failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  } finally {
    client.release();
  }
};

// ── Finance Transactions CSV Import ─────────────────────────
const importTransactions = async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows provided' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
  }

  const churchId = req.churchId;
  const results = { imported: 0, skipped: 0, errors: [] };

  // Pre-fetch categories for name-based matching
  const catRes = await query('SELECT id, LOWER(name) as name FROM giving_categories WHERE church_id = $1', [churchId]);
  const catMap = {};
  catRes.rows.forEach(c => { catMap[c.name] = c.id; });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const type = (r.transactionType || r.transaction_type || r.type || r.Type || '').toLowerCase();
      const amount = parseFloat(r.amount || r.Amount || 0);

      if (!['income', 'expense'].includes(type)) {
        results.errors.push({ row: i + 1, message: 'Transaction type must be "income" or "expense"' });
        results.skipped++;
        continue;
      }
      if (!amount || amount <= 0) {
        results.errors.push({ row: i + 1, message: 'Amount must be greater than 0' });
        results.skipped++;
        continue;
      }

      // Resolve category by name if no ID
      let categoryId = nullable(r.categoryId || r.category_id);
      const categoryName = (r.category || r.Category || r.categoryName || '').trim().toLowerCase();
      if (!categoryId && categoryName && catMap[categoryName]) {
        categoryId = catMap[categoryName];
      }

      try {
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
            req.user.id,
            nullable(r.notes || r.Notes)
          ]
        );
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i + 1, message: err.message.slice(0, 120) });
        results.skipped++;
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CSV transaction import failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  } finally {
    client.release();
  }
};

// ── Requisitions CSV Import ─────────────────────────────────
const importRequisitions = async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows provided' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
  }

  const churchId = req.churchId;
  const results = { imported: 0, skipped: 0, errors: [] };

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const title = sanitize(r.title || r.Title || '');
      if (!title) {
        results.errors.push({ row: i + 1, message: 'Title is required' });
        results.skipped++;
        continue;
      }

      const month = nullable(r.requisitionMonth || r.requisition_month || r.month || r.Month);
      if (!month) {
        results.errors.push({ row: i + 1, message: 'Requisition month is required' });
        results.skipped++;
        continue;
      }

      const totalAmount = parseFloat(r.totalAmount || r.total_amount || r.amount || r.Amount || 0);

      try {
        await client.query(
          `INSERT INTO requisitions (id, church_id, title, description, requisition_month, total_amount, items, raised_by, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            uuidv4(), churchId, title,
            nullable(r.description || r.Description),
            month, totalAmount,
            JSON.stringify([]),
            req.user.id,
            nullable(r.notes || r.Notes),
            'draft'
          ]
        );
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i + 1, message: err.message.slice(0, 120) });
        results.skipped++;
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CSV requisition import failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  } finally {
    client.release();
  }
};

// ── Purchase Requests CSV Import ────────────────────────────
const importPurchaseRequests = async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows provided' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
  }

  const churchId = req.churchId;
  const results = { imported: 0, skipped: 0, errors: [] };

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const title = sanitize(r.title || r.Title || '');
      if (!title) {
        results.errors.push({ row: i + 1, message: 'Title is required' });
        results.skipped++;
        continue;
      }

      const totalAmount = parseFloat(r.totalAmount || r.total_amount || r.amount || r.Amount || 0);
      if (!totalAmount || totalAmount <= 0) {
        results.errors.push({ row: i + 1, message: 'Amount must be greater than 0' });
        results.skipped++;
        continue;
      }

      const priority = (r.priority || r.Priority || 'normal').toLowerCase();
      if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
        results.errors.push({ row: i + 1, message: 'Priority must be low, normal, high, or urgent' });
        results.skipped++;
        continue;
      }

      try {
        await client.query(
          `INSERT INTO purchase_requests (id, church_id, title, description, vendor_name, total_amount, priority, items, raised_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            uuidv4(), churchId, title,
            nullable(r.description || r.Description),
            nullable(r.vendorName || r.vendor_name || r.vendor || r.Vendor),
            totalAmount, priority,
            JSON.stringify([]),
            req.user.id
          ]
        );
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i + 1, message: err.message.slice(0, 120) });
        results.skipped++;
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CSV purchase request import failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  } finally {
    client.release();
  }
};

module.exports = { importMembers, importFirstTimers, importTransactions, importRequisitions, importPurchaseRequests };
