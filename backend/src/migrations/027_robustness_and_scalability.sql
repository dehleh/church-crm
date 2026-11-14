-- ============================================================
-- 027_robustness_and_scalability.sql
-- Database integrity, atomic sequential counters, idempotency,
-- and full-text / trigram search performance.
-- ============================================================

-- 1. ATOMIC TENANT COUNTERS (Prevents duplicate member numbers & race conditions)
CREATE TABLE IF NOT EXISTS church_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  counter_type VARCHAR(50) NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, counter_type)
);

CREATE INDEX IF NOT EXISTS idx_church_counters_lookup ON church_counters(church_id, counter_type);

-- Seed member_number counter for all existing churches
INSERT INTO church_counters (church_id, counter_type, current_value)
SELECT
  c.id,
  'member_number',
  COALESCE(
    (
      SELECT MAX(
        CASE
          WHEN m.member_number ~ '^[A-Za-z]+-[0-9]+$' THEN SUBSTRING(m.member_number FROM '[0-9]+')::BIGINT
          ELSE NULL
        END
      )
      FROM members m
      WHERE m.church_id = c.id
    ),
    (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id),
    0
  )
FROM churches c
ON CONFLICT (church_id, counter_type) DO NOTHING;

-- 2. DEDUPLICATION / UNIQUE CONSTRAINTS
-- Prevent duplicate member numbers within the same church
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_church_member_num
ON members(church_id, member_number)
WHERE member_number IS NOT NULL;

-- Ensure transaction references are unique per church for idempotent accounting
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_church_ref
ON transactions(church_id, reference)
WHERE reference IS NOT NULL;

-- 3. WEBHOOK IDEMPOTENCY STORE (Prevents duplicate processing on retries)
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(150) NOT NULL,
  payload_hash VARCHAR(64),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_lookup ON processed_webhooks(provider, event_id);

-- 4. SEARCH SCALABILITY (pg_trgm for fast congregation lookups)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_members_trgm_search
  ON members USING gin (
    (first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(member_number, '')) gin_trgm_ops
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm extension or GIN index skipped: %', SQLERRM;
END $$;
