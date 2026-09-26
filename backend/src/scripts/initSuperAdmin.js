const { pool, query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

async function ensureSuperAdmin() {
  try {
    const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || 'superadmin@churchos.platform').toLowerCase().trim();
    const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'PlatformAdmin2026!';

    // 1. Promote any existing demo admin if found
    try {
      await query(
        `UPDATE users SET is_super_admin = true
         WHERE LOWER(email) = 'admin@tbclekki.ng'`
      );
    } catch {
      // Non-fatal if table not initialized
    }

    // 2. Check if the dedicated platform superadmin already exists
    const { rows: existingUser } = await query(
      'SELECT id, email, is_super_admin FROM users WHERE LOWER(email) = $1',
      [adminEmail]
    );

    if (existingUser[0]) {
      if (!existingUser[0].is_super_admin) {
        await query('UPDATE users SET is_super_admin = true WHERE id = $1', [existingUser[0].id]);
        logger.info(`Promoted user ${adminEmail} to platform super_admin`);
      }
      return;
    }

    // 3. Ensure a platform operations tenant church exists
    let churchId;
    const { rows: churches } = await query('SELECT id FROM churches ORDER BY created_at ASC LIMIT 1');
    if (churches[0]) {
      churchId = churches[0].id;
    } else {
      const { rows: newChurch } = await query(
        `INSERT INTO churches (id, name, slug, subscription_plan)
         VALUES ($1, 'Platform Operations', 'platform-ops', 'enterprise')
         RETURNING id`,
        [uuidv4()]
      );
      churchId = newChurch[0].id;
    }

    // 4. Create the dedicated superadmin account
    const hash = await bcrypt.hash(adminPassword, 12);
    const userId = uuidv4();

    await query(
      `INSERT INTO users (
        id, church_id, first_name, last_name, email,
        password_hash, role, is_super_admin, is_active
      ) VALUES ($1, $2, 'Platform', 'SuperAdmin', $3, $4, 'super_admin', true, true)
      ON CONFLICT (email) DO UPDATE SET is_super_admin = true`,
      [userId, churchId, adminEmail, hash]
    );

    logger.info(`✅ Default Platform Super Admin initialized: ${adminEmail}`);
  } catch (err) {
    logger.warn('ensureSuperAdmin non-fatal notice:', { error: err.message });
  }
}

module.exports = { ensureSuperAdmin };
