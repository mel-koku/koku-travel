-- Add location_id column to favorites table for direct joins with locations table
-- This addresses the place_id vs location_id mismatch issue

-- Add the location_id column
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS location_id text;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_favorites_location_id ON favorites(location_id);

-- Backfill location_id from locations table by matching place_id
UPDATE favorites f
SET location_id = l.id
FROM locations l
WHERE f.place_id = l.place_id
  AND f.location_id IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN favorites.location_id IS 'Internal location ID from locations table, populated from place_id lookup';
