-- ============================================================
-- 016: Ensure Platform Operations Tenant Exists
-- (Platform Super Admin provisioning is driven by PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD env vars.)
-- ============================================================

DO $$
DECLARE
  v_church_id UUID;
BEGIN
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
END $$;
