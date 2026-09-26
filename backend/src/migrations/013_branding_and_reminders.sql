-- ============================================================
-- 013_branding_and_reminders.sql
-- Church Branding, Pastors Showcase, Event Banners & Automated Reminders
-- ============================================================

-- 1. CHURCH PROFILE BRANDING & LEADERSHIP
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS mission TEXT,
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pastors JSONB DEFAULT '[]';

-- 2. EVENT BANNERS & AUTOMATED REMINDERS
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_time_before VARCHAR(30) DEFAULT '24h', -- 24h | 2h | 1h | morning_of
  ADD COLUMN IF NOT EXISTS reminder_channels TEXT[] DEFAULT '{"whatsapp"}', -- whatsapp | email | sms
  ADD COLUMN IF NOT EXISTS reminder_target VARCHAR(30) DEFAULT 'all_members', -- all_members | attendees | branch
  ADD COLUMN IF NOT EXISTS reminder_custom_text TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_reminder ON events(reminder_enabled, reminder_sent_at, start_datetime);

-- 3. COMMUNICATIONS SCHEDULED STATUS
CREATE INDEX IF NOT EXISTS idx_communications_scheduled ON communications(status, scheduled_at);
