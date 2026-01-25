-- Add is_featured column to locations table for manual curation
-- This allows marking specific locations as featured for the carousel

ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Create a partial index for efficient querying of featured locations
-- Only indexes rows where is_featured = true to minimize index size
CREATE INDEX IF NOT EXISTS idx_locations_is_featured ON locations (is_featured) WHERE is_featured = true;

COMMENT ON COLUMN locations.is_featured IS 'Manually curated flag to mark locations for featured carousel display';
