-- Add craft_type column to locations table for craft vertical taxonomy
ALTER TABLE locations ADD COLUMN IF NOT EXISTS craft_type text;

-- Partial index for efficient craft-type queries (only rows with a value)
CREATE INDEX IF NOT EXISTS idx_locations_craft_type ON locations (craft_type) WHERE craft_type IS NOT NULL;
