-- License purchase requests (sales leads) submitted from public landing page
CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name        VARCHAR(255) NOT NULL,
  contact_name       VARCHAR(255) NOT NULL,
  admin_email        VARCHAR(255) NOT NULL,
  phone              VARCHAR(50),
  country            VARCHAR(100),
  plan               VARCHAR(30) NOT NULL,           -- starter | growth | enterprise
  branches_estimate  INT,
  members_estimate   INT,
  message            TEXT,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | contacted | approved | rejected
  notes              TEXT,
  processed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_requests_status   ON license_requests(status);
CREATE INDEX IF NOT EXISTS idx_license_requests_created  ON license_requests(created_at DESC);
