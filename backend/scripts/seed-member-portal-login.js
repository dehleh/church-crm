/**
 * One-off: provision portal credentials for existing members.
 *
 * Usage (local against Railway DB):
 *   cd backend
 *   node scripts/seed-member-portal-login.js                 # first active member with email per church
 *   node scripts/seed-member-portal-login.js MBR-00001       # specific member number
 *   node scripts/seed-member-portal-login.js --all           # every active member with an email
 *
 * Optional env: MEMBER_PORTAL_PASSWORD (default: "Welcome@123")
 *
 * Requires DATABASE_URL (or DB_*) to be set. Easiest:
 *   railway run node scripts/seed-member-portal-login.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../src/config/database');

const PASSWORD = process.env.MEMBER_PORTAL_PASSWORD || 'Welcome@123';

async function main() {
  const arg = process.argv[2];
  const all = arg === '--all';
  const memberNumber = !all && arg ? arg : null;

  let sql, params;
  if (memberNumber) {
    sql = `
      SELECT m.id, m.member_number, m.first_name, m.last_name, m.email,
             c.name AS church_name, c.slug AS church_slug
      FROM members m JOIN churches c ON c.id = m.church_id
      WHERE m.member_number = $1 AND m.email IS NOT NULL AND m.membership_status = 'active'
    `;
    params = [memberNumber];
  } else if (all) {
    sql = `
      SELECT m.id, m.member_number, m.first_name, m.last_name, m.email,
             c.name AS church_name, c.slug AS church_slug
      FROM members m JOIN churches c ON c.id = m.church_id
      WHERE m.email IS NOT NULL AND m.membership_status = 'active'
      ORDER BY c.slug, m.created_at
    `;
    params = [];
  } else {
    sql = `
      SELECT DISTINCT ON (c.id)
             m.id, m.member_number, m.first_name, m.last_name, m.email,
             c.name AS church_name, c.slug AS church_slug
      FROM members m JOIN churches c ON c.id = m.church_id
      WHERE m.email IS NOT NULL AND m.membership_status = 'active'
      ORDER BY c.id, m.created_at
    `;
    params = [];
  }

  const { rows } = await query(sql, params);
  if (!rows.length) {
    console.log('No active members with an email address found.');
    process.exit(0);
  }

  const hash = await bcrypt.hash(PASSWORD, 12);
  for (const r of rows) {
    await query(
      `UPDATE members SET password_hash = $1, portal_invited_at = COALESCE(portal_invited_at, NOW()) WHERE id = $2`,
      [hash, r.id]
    );
  }

  console.log('\n✅ Portal credentials provisioned (' + rows.length + '):\n');
  for (const r of rows) {
    console.log('────────────────────────────────────────');
    console.log('Church       :', r.church_name);
    console.log('Login URL    : /portal/' + r.church_slug + '/login');
    console.log('Member       : ' + r.first_name + ' ' + r.last_name + ' (' + r.member_number + ')');
    console.log('Email        :', r.email);
    console.log('Password     :', PASSWORD);
  }
  console.log('────────────────────────────────────────\n');
  console.log('⚠️  Tell the member to change this password after first login.\n');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
