-- Migration 033: Custom Domain Mapping & Self-Hosting Support
ALTER TABLE churches ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_churches_custom_domain ON churches (LOWER(custom_domain));
