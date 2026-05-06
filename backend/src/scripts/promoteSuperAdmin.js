#!/usr/bin/env node
/**
 * Promote (or demote) a user to platform super_admin.
 *
 * Usage:
 *   node src/scripts/promoteSuperAdmin.js <email>           # promote
 *   node src/scripts/promoteSuperAdmin.js <email> --revoke  # demote
 */
require('dotenv').config();
const { query, pool } = require('../config/database');

(async () => {
  const email = process.argv[2];
  const revoke = process.argv.includes('--revoke');

  if (!email) {
    console.error('Usage: node src/scripts/promoteSuperAdmin.js <email> [--revoke]');
    process.exit(1);
  }

  try {
    const { rows } = await query(
      `UPDATE users SET is_super_admin = $1 WHERE email = $2
       RETURNING id, email, first_name, last_name, is_super_admin`,
      [!revoke, email]
    );
    if (!rows[0]) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    const u = rows[0];
    console.log(
      `✔ ${u.first_name} ${u.last_name} <${u.email}> is_super_admin=${u.is_super_admin}`
    );
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
