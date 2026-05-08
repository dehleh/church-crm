-- Family / lifecycle fields used for communication audience filters
ALTER TABLE members ADD COLUMN IF NOT EXISTS wedding_anniversary_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0;

-- Speed up date-based audience queries (birthday / anniversary blasts).
-- to_char() is not IMMUTABLE; use EXTRACT(month/day) which is.
CREATE INDEX IF NOT EXISTS idx_members_dob_md
  ON members ((EXTRACT(MONTH FROM date_of_birth)), (EXTRACT(DAY FROM date_of_birth)))
  WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_anniv_md
  ON members ((EXTRACT(MONTH FROM wedding_anniversary_date)), (EXTRACT(DAY FROM wedding_anniversary_date)))
  WHERE wedding_anniversary_date IS NOT NULL;
