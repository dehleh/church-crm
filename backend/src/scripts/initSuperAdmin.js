const { pool, query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

async function ensureSuperAdmin() {
  try {
    const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || 'superadmin@churchos.platform').toLowerCase().trim();
    const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'PlatformAdmin2026!';
    const hash = await bcrypt.hash(adminPassword, 12);

    // 1. Promote and unlock any demo admin if found
    try {
      await query(
        `UPDATE users 
         SET is_super_admin = true,
             is_active = true,
             failed_login_attempts = 0,
             locked_until = NULL
         WHERE LOWER(email) = 'admin@tbclekki.ng'`
      );
    } catch {
      // Non-fatal if table not initialized
    }

    // 2. Ensure the dedicated, permanent platform operations system tenant exists
    const systemChurchId = '00000000-0000-0000-0000-000000000001';
    try {
      await query(
        `INSERT INTO churches (id, name, slug, subscription_plan, is_active, is_system)
         VALUES ($1, 'ChurchOS Platform Operations', 'platform-operations-system', 'enterprise', true, true)
         ON CONFLICT (id) DO UPDATE SET is_system = true, is_active = true`,
        [systemChurchId]
      );
    } catch {
      // Fallback if is_system column is not yet migrated
      await query(
        `INSERT INTO churches (id, name, slug, subscription_plan, is_active)
         VALUES ($1, 'ChurchOS Platform Operations', 'platform-operations-system', 'enterprise', true)
         ON CONFLICT (id) DO NOTHING`,
        [systemChurchId]
      );
    }

    // 3. Check if the dedicated platform superadmin already exists
    const { rows: existingUsers } = await query(
      'SELECT id, church_id, email, is_super_admin FROM users WHERE LOWER(email) = $1',
      [adminEmail]
    );

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      await query(
        `UPDATE users
         SET password_hash = $1,
             church_id = $2,
             is_super_admin = true,
             is_active = true,
             role = 'super_admin',
             failed_login_attempts = 0,
             locked_until = NULL
         WHERE id = $3`,
        [hash, systemChurchId, existingUser.id]
      );
      logger.info(`✅ Platform Super Admin account verified & updated: ${adminEmail}`);
      console.log(`✅ Platform Super Admin account verified & updated: ${adminEmail}`);
      return;
    }

    // 4. Create the dedicated superadmin account safely, bound to the system church
    const userId = uuidv4();
    await query(
      `INSERT INTO users (
        id, church_id, first_name, last_name, email,
        password_hash, role, is_super_admin, is_active, failed_login_attempts, locked_until
      ) VALUES ($1, $2, 'Platform', 'SuperAdmin', $3, $4, 'super_admin', true, true, 0, NULL)`,
      [userId, systemChurchId, adminEmail, hash]
    );

    logger.info(`✅ Default Platform Super Admin initialized successfully: ${adminEmail}`);
    console.log(`✅ Default Platform Super Admin initialized successfully: ${adminEmail}`);
  } catch (err) {
    logger.error('❌ Failed to ensure Platform Super Admin:', { error: err.message, stack: err.stack });
    console.error('❌ Failed to ensure Platform Super Admin:', err.message);
  }
}

module.exports = { ensureSuperAdmin };
