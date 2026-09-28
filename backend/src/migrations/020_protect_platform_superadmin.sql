-- ============================================================
-- 020: Protect Platform Operations Tenant & Super Admin Accounts
-- Prevents cascade-deletion of super admin accounts when a church is deleted.
-- ============================================================

-- 1. Add is_system flag to churches table
ALTER TABLE churches ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 2. Ensure dedicated, immutable system tenant exists
INSERT INTO churches (id, name, slug, subscription_plan, is_active, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ChurchOS Platform Operations',
  'platform-operations-system',
  'enterprise',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET is_system = true, is_active = true;

-- Also mark any existing platform-ops church as system
UPDATE churches SET is_system = true WHERE slug IN ('platform-ops', 'platform-operations-system');

-- 3. Allow church_id on users to be nullable for safety
ALTER TABLE users ALTER COLUMN church_id DROP NOT NULL;

-- 4. Reassign all superadmin accounts to the dedicated system church
UPDATE users
SET church_id = '00000000-0000-0000-0000-000000000001'
WHERE is_super_admin = true;

-- 5. Guarantee superadmin@churchos.platform exists and is fully unlocked
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'superadmin@churchos.platform';
  -- bcrypt 12-round hash for 'PlatformAdmin2026!'
  v_hash TEXT := '$2a$12$dENVL5zMkIWcBlXpVfjbweAawyPmpwSaHEOxGOCCGbUCXEjqC5p/2';
BEGIN
  SELECT id INTO v_user_id FROM users WHERE LOWER(email) = v_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET church_id = '00000000-0000-0000-0000-000000000001',
        password_hash = v_hash,
        is_super_admin = true,
        is_active = true,
        role = 'super_admin',
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = v_user_id;
  ELSE
    INSERT INTO users (
      id, church_id, first_name, last_name, email,
      password_hash, role, is_super_admin, is_active, failed_login_attempts
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      'Platform',
      'SuperAdmin',
      v_email,
      v_hash,
      'super_admin',
      true,
      true,
      0
    );
  END IF;
END $$;
