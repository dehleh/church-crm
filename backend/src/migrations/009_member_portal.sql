-- Member-facing portal: per-member credentials and login tracking.
-- Per-church enablement lives in churches.settings.member_portal_enabled (JSONB).
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_invited_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_last_login_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_refresh_token TEXT;

-- Email + church should be unique among portal-enabled members so login is unambiguous.
CREATE INDEX IF NOT EXISTS idx_members_email_lower
  ON members ((LOWER(email))) WHERE email IS NOT NULL;
