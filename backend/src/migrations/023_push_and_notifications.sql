-- ============================================================
-- 023: Web Push Subscriptions & Member Notification Preferences
-- ============================================================

-- 1. Browser Web Push Subscriptions (Mobile & Desktop Phone Push)
CREATE TABLE IF NOT EXISTS member_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_push_subs_member
  ON member_push_subscriptions(church_id, member_id);

-- 2. Member Notification Channel & Topic Preferences
CREATE TABLE IF NOT EXISTS member_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_devotionals BOOLEAN NOT NULL DEFAULT true,
  notify_prayers BOOLEAN NOT NULL DEFAULT true,
  notify_announcements BOOLEAN NOT NULL DEFAULT true,
  notify_events BOOLEAN NOT NULL DEFAULT true,
  notify_giving BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_notif_prefs_church
  ON member_notification_preferences(church_id, member_id);

-- 3. Add dispatch tracking to daily_devotionals
ALTER TABLE daily_devotionals
  ADD COLUMN IF NOT EXISTS morning_pushed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS morning_emailed_at TIMESTAMPTZ;
