-- Add jta_approved flag to locations for social proof display
ALTER TABLE locations ADD COLUMN IF NOT EXISTS jta_approved boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_locations_jta_approved ON locations (jta_approved) WHERE jta_approved = true;
