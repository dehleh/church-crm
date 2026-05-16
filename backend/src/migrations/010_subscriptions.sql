-- ============================================================
-- 010_subscriptions.sql
-- Multi-tenancy toggle, license whitelist, plan limits
-- ============================================================

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS multi_branch_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS license_notes TEXT,
  ADD COLUMN IF NOT EXISTS branch_limit INT,
  ADD COLUMN IF NOT EXISTS member_limit INT;

-- Standardize plan values going forward: starter | growth | enterprise
-- (legacy values like 'free' / 'pro' are tolerated; super-admin can update them)

-- Subscription transactions / payment audit log
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'paystack',
  reference VARCHAR(255) UNIQUE,
  plan VARCHAR(30),
  amount_kobo BIGINT,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | success | failed
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_tx_church ON subscription_transactions(church_id);
CREATE INDEX IF NOT EXISTS idx_sub_tx_status ON subscription_transactions(status);
