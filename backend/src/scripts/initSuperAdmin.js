const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Ensures the system operations tenant exists and optionally bootstraps an
 * initial Platform Super Admin ONLY when PLATFORM_ADMIN_EMAIL and
 * PLATFORM_ADMIN_PASSWORD are explicitly configured via environment variables
 * and the account does not already exist. Never overwrites existing passwords.
 */
async function ensureSuperAdmin() {
  try {
    // 1. Ensure the dedicated system tenant exists
    const systemChurchId = '00000000-0000-0000-0000-000000000001';
    try {
      await query(
        `INSERT INTO churches (id, name, slug, subscription_plan, is_active, is_system)
         VALUES ($1, 'ChurchOS Platform Operations', 'platform-operations-system', 'enterprise', true, true)
         ON CONFLICT (id) DO UPDATE SET is_system = true, is_active = true`,
        [systemChurchId]
      );
    } catch {
      await query(
        `INSERT INTO churches (id, name, slug, subscription_plan, is_active)
         VALUES ($1, 'ChurchOS Platform Operations', 'platform-operations-system', 'enterprise', true)
         ON CONFLICT (id) DO NOTHING`,
        [systemChurchId]
      );
    }

    const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || '').toLowerCase().trim();
    const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || '';
    if (!adminEmail || !adminPassword) {
      return;
    }

    // 2. Never overwrite an existing user's credentials during startup
    const { rows: existingUsers } = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [adminEmail]
    );
    if (existingUsers && existingUsers.length > 0) {
      return;
    }

    // 3. Create the dedicated superadmin account bound to the system church
    const hash = await bcrypt.hash(adminPassword, 12);
    const userId = uuidv4();
    await query(
      `INSERT INTO users (
        id, church_id, first_name, last_name, email,
        password_hash, role, is_super_admin, is_active, failed_login_attempts, locked_until
      ) VALUES ($1, $2, 'Platform', 'SuperAdmin', $3, $4, 'super_admin', true, true, 0, NULL)`,
      [userId, systemChurchId, adminEmail, hash]
    );

    logger.info(`Platform Super Admin initialized: ${adminEmail}`);
  } catch (err) {
    logger.error('Failed to ensure Platform Super Admin:', { error: err.message });
  }
}

module.exports = { ensureSuperAdmin };
