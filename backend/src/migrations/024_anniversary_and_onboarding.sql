-- ============================================================
-- 024_anniversary_and_onboarding.sql
-- Wedding Anniversary Wishes Automation & Member Onboarding Tokens
-- ============================================================

-- 1. TRACKING OF SENT WEDDING ANNIVERSARY WISHES
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_anniversary_wish_year INTEGER;
CREATE INDEX IF NOT EXISTS idx_members_anniv_wish ON members(church_id, last_anniversary_wish_year);

-- 2. MEMBER ONBOARDING / SET PASSWORD TOKEN
ALTER TABLE members ADD COLUMN IF NOT EXISTS set_password_token VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS set_password_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_members_set_pwd_token ON members(set_password_token) WHERE set_password_token IS NOT NULL;
