require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('../src/config/database');
(async () => {
  const email = 'demo@churchos.app';
  const password = 'Welcome@123';
  const hash = await bcrypt.hash(password, 12);
  const r = await query(
    `UPDATE members
       SET email = $1, password_hash = $2, portal_invited_at = NOW()
       WHERE member_number = 'MBR-00001'
       RETURNING member_number, first_name, last_name, email`,
    [email, hash]
  );
  console.log('\n✅ Updated:', r.rows[0]);
  console.log('Password   :', password);
  await pool.end();
})();
