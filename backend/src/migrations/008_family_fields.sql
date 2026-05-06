-- Family / lifecycle fields used for communication audience filters
ALTER TABLE members ADD COLUMN IF NOT EXISTS wedding_anniversary_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0;

-- Speed up date-based audience queries (birthday / anniversary blasts)
CREATE INDEX IF NOT EXISTS idx_members_dob_md
  ON members ((to_char(date_of_birth, 'MM-DD'))) WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_anniv_md
  ON members ((to_char(wedding_anniversary_date, 'MM-DD'))) WHERE wedding_anniversary_date IS NOT NULL;
