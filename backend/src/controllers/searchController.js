const { query } = require('../config/database');

const globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: { members: [], firstTimers: [], events: [], transactions: [] } });
  }
  const term = `%${q.trim()}%`;
  const churchId = req.churchId;

  try {
    const [members, firstTimers, events, transactions] = await Promise.all([
      query(
        `SELECT id, first_name, last_name, member_number, phone, email, membership_status
         FROM members WHERE church_id = $1
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR member_number ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
         LIMIT 6`,
        [churchId, term]
      ),
      query(
        `SELECT id, first_name, last_name, phone, follow_up_status, visit_date
         FROM first_timers WHERE church_id = $1
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR phone ILIKE $2)
         LIMIT 4`,
        [churchId, term]
      ),
      query(
        `SELECT id, title, event_type, start_datetime, status
         FROM events WHERE church_id = $1
         AND (title ILIKE $2)
         LIMIT 4`,
        [churchId, term]
      ),
      query(
        `SELECT id, description, amount, transaction_type, transaction_date
         FROM transactions WHERE church_id = $1
         AND (description ILIKE $2 OR reference ILIKE $2)
         LIMIT 4`,
        [churchId, term]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        members: members.rows,
        firstTimers: firstTimers.rows,
        events: events.rows,
        transactions: transactions.rows,
      },
      total: members.rows.length + firstTimers.rows.length + events.rows.length + transactions.rows.length
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { globalSearch };
