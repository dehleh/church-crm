-- ============================================================
-- 002: Security hardening columns
-- ============================================================

-- Login lockout columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Force password change flag (for invited users / password resets)
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Unique constraint on attendance to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_event_member_unique'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_event_member_unique UNIQUE (event_id, member_id);
  END IF;
END $$;
