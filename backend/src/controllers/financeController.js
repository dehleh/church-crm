const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// GET /api/finance/transactions
const getTransactions = async (req, res) => {
  const { page = 1, limit = 20, type, categoryId, memberId, startDate, endDate, branchId } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['t.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (type) { conditions.push(`t.transaction_type = $${idx++}`); params.push(type); }
    if (categoryId) { conditions.push(`t.category_id = $${idx++}`); params.push(categoryId); }
    if (memberId) { conditions.push(`t.member_id = $${idx++}`); params.push(memberId); }
    if (branchId) { conditions.push(`t.branch_id = $${idx++}`); params.push(branchId); }
    if (startDate) { conditions.push(`t.transaction_date >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`t.transaction_date <= $${idx++}`); params.push(endDate); }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, params);

    params.push(parseInt(limit), offset);
    const { rows } = await query(
      `SELECT t.*,
              m.first_name || ' ' || m.last_name as member_name,
              gc.name as category_name,
              fa.name as account_name,
              u.first_name || ' ' || u.last_name as recorded_by_name
       FROM transactions t
       LEFT JOIN members m ON m.id = t.member_id
       LEFT JOIN giving_categories gc ON gc.id = t.category_id
       LEFT JOIN finance_accounts fa ON fa.id = t.account_id
       LEFT JOIN users u ON u.id = t.recorded_by
       WHERE ${where}
       ORDER BY t.transaction_date DESC, t.created_at DESC
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
        totalPages: Math.ceil(countRes.rows[0].count / limit)
      }
    });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/finance/transactions
const createTransaction = async (req, res) => {
  const {
    accountId, categoryId, memberId, transactionType, amount,
    description, paymentMethod, transactionDate, eventId, notes, branchId
  } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const id = uuidv4();
    const reference = `TXN-${Date.now()}`;
    const { rows } = await client.query(
      `INSERT INTO transactions (
        id, church_id, branch_id, account_id, category_id, member_id,
        transaction_type, amount, description, reference, payment_method,
        transaction_date, event_id, recorded_by, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        id, req.churchId, branchId || null, accountId || null, categoryId || null, memberId || null,
        transactionType, amount, description || null, reference, paymentMethod || null,
        transactionDate || new Date(), eventId || null, req.user.id, notes || null
      ]
    );

    // Update account balance atomically
    if (accountId) {
      const balanceChange = transactionType === 'income' ? amount : -amount;
      await client.query(
        'UPDATE finance_accounts SET balance = balance + $1 WHERE id = $2',
        [balanceChange, accountId]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(err.message, { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /api/finance/summary
const getFinanceSummary = async (req, res) => {
  const { period = 'month' } = req.query;
  const interval = period === 'year' ? '1 year' : period === 'week' ? '7 days' : '30 days';

  try {
    const [summary, byCategory, monthlyTrend, accounts] = await Promise.all([
      query(
        `SELECT
          SUM(amount) FILTER (WHERE transaction_type = 'income') as total_income,
          SUM(amount) FILTER (WHERE transaction_type = 'expense') as total_expense,
          SUM(amount) FILTER (WHERE transaction_type = 'income' AND transaction_date >= NOW() - INTERVAL '${interval}') as period_income,
          SUM(amount) FILTER (WHERE transaction_type = 'expense' AND transaction_date >= NOW() - INTERVAL '${interval}') as period_expense
         FROM transactions WHERE church_id = $1 AND status = 'completed'`,
        [req.churchId]
      ),
      query(
        `SELECT gc.name, SUM(t.amount) as total, COUNT(*) as count
         FROM transactions t
         JOIN giving_categories gc ON gc.id = t.category_id
         WHERE t.church_id = $1 AND t.transaction_type = 'income'
           AND t.transaction_date >= NOW() - INTERVAL '${interval}'
         GROUP BY gc.name ORDER BY total DESC`,
        [req.churchId]
      ),
      query(
        `SELECT DATE_TRUNC('month', transaction_date) as month,
                SUM(amount) FILTER (WHERE transaction_type = 'income') as income,
                SUM(amount) FILTER (WHERE transaction_type = 'expense') as expense
         FROM transactions WHERE church_id = $1 AND transaction_date >= NOW() - INTERVAL '12 months'
         GROUP BY month ORDER BY month ASC`,
        [req.churchId]
      ),
      query(
        `SELECT name, account_type, balance, currency FROM finance_accounts
         WHERE church_id = $1 AND is_active = true ORDER BY balance DESC`,
        [req.churchId]
      )
    ]);

    return res.json({
      success: true,
      data: {
        summary: summary.rows[0],
        byCategory: byCategory.rows,
        monthlyTrend: monthlyTrend.rows,
        accounts: accounts.rows
      }
    });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/finance/accounts
const getAccounts = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM finance_accounts WHERE church_id = $1 AND is_active = true ORDER BY name`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/finance/accounts
const createAccount = async (req, res) => {
  const { name, accountType, bankName, accountNumber, currency, branchId } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO finance_accounts (id, church_id, branch_id, name, account_type, bank_name, account_number, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), req.churchId, branchId || null, name, accountType, bankName || null, accountNumber || null, currency || 'NGN']
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/finance/categories
const getCategories = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM giving_categories WHERE church_id = $1 AND is_active = true ORDER BY name`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/finance/categories
const createCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }
  try {
    const existing = await query(
      `SELECT id FROM giving_categories WHERE church_id = $1 AND LOWER(name) = LOWER($2) AND is_active = true`,
      [req.churchId, name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.json({ success: true, data: existing.rows[0], message: 'Category already exists' });
    }
    const { rows } = await query(
      `INSERT INTO giving_categories (id, church_id, name, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [uuidv4(), req.churchId, name.trim(), description || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error(err.message, { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getTransactions, createTransaction, getFinanceSummary, getAccounts, createAccount, getCategories, createCategory };
