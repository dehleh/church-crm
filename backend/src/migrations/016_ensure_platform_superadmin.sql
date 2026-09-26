-- ============================================================
-- 016: Guarantee Platform Super Administrator Account
-- ============================================================

-- 1. Ensure any demo head pastor (admin@tbclekki.ng) has super admin privileges unlocked
UPDATE users
SET is_super_admin = true,
    is_active = true,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE LOWER(email) = 'admin@tbclekki.ng';

-- 2. Ensure platform operations church and dedicated super admin account exist
DO $$
DECLARE
  v_church_id UUID;
  v_user_id UUID;
  v_email TEXT := 'superadmin@churchos.platform';
  -- bcrypt 12-round precomputed hash for 'PlatformAdmin2026!'
  v_hash TEXT := '$2a$12$dENVL5zMkIWcBlXpVfjbweAawyPmpwSaHEOxGOCCGbUCXEjqC5p/2';
BEGIN
  -- Find an existing church to link or create platform operations church
  SELECT id INTO v_church_id FROM churches ORDER BY created_at ASC LIMIT 1;

  IF v_church_id IS NULL THEN
    BEGIN
      v_church_id := gen_random_uuid();
    EXCEPTION WHEN undefined_function THEN
      v_church_id := uuid_generate_v4();
    END;

    INSERT INTO churches (id, name, slug, subscription_plan, is_active)
    VALUES (v_church_id, 'Platform Operations', 'platform-ops', 'enterprise', true);
  END IF;

  -- Check if superadmin@churchos.platform exists
  SELECT id INTO v_user_id FROM users WHERE LOWER(email) = v_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET password_hash = v_hash,
        is_super_admin = true,
        is_active = true,
        role = 'super_admin',
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = v_user_id;
  ELSE
    BEGIN
      v_user_id := gen_random_uuid();
    EXCEPTION WHEN undefined_function THEN
      v_user_id := uuid_generate_v4();
    END;

    INSERT INTO users (
      id, church_id, first_name, last_name, email,
      password_hash, role, is_super_admin, is_active, failed_login_attempts
    ) VALUES (
      v_user_id, v_church_id, 'Platform', 'SuperAdmin', v_email,
      v_hash, 'super_admin', true, true, 0
    );
  END IF;
END $$;
