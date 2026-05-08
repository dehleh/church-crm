require('dotenv').config();
const { query, pool } = require('../src/config/database');
(async () => {
  const r = await query(
    `SELECT member_number, first_name, last_name, email
     FROM members
     WHERE email IS NOT NULL AND membership_status = 'active'
     ORDER BY created_at LIMIT 20`
  );
  console.table(r.rows);
  await pool.end();
})();
