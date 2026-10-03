-- ============================================================
-- 025_family_units_and_spouse_linking.sql
-- Family Household Units, Bidirectional Spouse Linking, and Children Deduplication
-- ============================================================

-- 1. Family Unit and Spouse columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_phone VARCHAR(50);
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_primary_family_contact BOOLEAN DEFAULT true;
ALTER TABLE members ADD COLUMN IF NOT EXISTS family_role VARCHAR(50) DEFAULT 'head';

-- 2. Indexes for fast household matching and query performance
CREATE INDEX IF NOT EXISTS idx_members_family ON members(church_id, family_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(church_id, spouse_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse_phone ON members(church_id, spouse_phone);
CREATE INDEX IF NOT EXISTS idx_members_primary_contact ON members(church_id, is_primary_family_contact);

-- 3. Initialize family_id for all existing members if not set
UPDATE members
SET family_id = id
WHERE family_id IS NULL;

-- 4. Automatically link any existing married couples who share the exact same address and wedding anniversary date
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT m1.id as id1, m2.id as id2, m1.family_id as fam_id
    FROM members m1
    JOIN members m2 ON m1.church_id = m2.church_id
      AND m1.id < m2.id
      AND m1.marital_status = 'married'
      AND m2.marital_status = 'married'
      AND m1.wedding_anniversary_date IS NOT NULL
      AND m1.wedding_anniversary_date = m2.wedding_anniversary_date
      AND LOWER(TRIM(m1.address)) = LOWER(TRIM(m2.address))
    WHERE m1.spouse_id IS NULL AND m2.spouse_id IS NULL
  ) LOOP
    -- Link spouses bidirectionally and group into m1's family_id
    UPDATE members SET spouse_id = rec.id2, family_id = rec.fam_id WHERE id = rec.id1;
    UPDATE members SET spouse_id = rec.id1, family_id = rec.fam_id, is_primary_family_contact = false WHERE id = rec.id2;
  END LOOP;
END $$;
