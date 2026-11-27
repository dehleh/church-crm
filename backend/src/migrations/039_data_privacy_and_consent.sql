-- ============================================================
-- Migration 039: NDPC Data Privacy Compliance & Consent Audit Trails
-- Complies with the Nigeria Data Protection Act (NDPA 2023)
-- ============================================================

ALTER TABLE first_timers
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_members_consent ON members(church_id, consent_given);
CREATE INDEX IF NOT EXISTS idx_first_timers_consent ON first_timers(church_id, consent_given);
