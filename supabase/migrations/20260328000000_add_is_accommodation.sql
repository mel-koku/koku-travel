-- Add is_accommodation flag for display filtering
-- Accommodation locations (hotels, ryokans, lodges) stay active but are
-- excluded from trip builder, places page, and filter-options queries.
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_accommodation boolean DEFAULT false;

-- Index for the filter query (most locations are false, so this is selective)
CREATE INDEX IF NOT EXISTS idx_locations_is_accommodation ON locations (is_accommodation) WHERE is_accommodation = true;
