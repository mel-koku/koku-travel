-- Add is_active column to locations table for soft-hiding incomplete/artifact entries
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Index for filtering (most queries will filter on is_active = true)
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations (is_active) WHERE is_active = false;

-- Set null-coordinate JTA artifacts to inactive
UPDATE locations SET is_active = false WHERE lat IS NULL AND lng IS NULL;
