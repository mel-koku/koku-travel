-- Add neighborhood column to locations table for geographic diversity scoring
-- This allows tracking which district/area a location is in within a city
-- Used by the itinerary generator to avoid clustering activities in the same neighborhood

ALTER TABLE locations ADD COLUMN IF NOT EXISTS neighborhood text;

-- Create an index for efficient querying by neighborhood within a city
CREATE INDEX IF NOT EXISTS idx_locations_city_neighborhood ON locations (city, neighborhood) WHERE neighborhood IS NOT NULL;

COMMENT ON COLUMN locations.neighborhood IS 'Neighborhood or district within the city (e.g., Gion, Arashiyama). Used for geographic diversity in itinerary generation.';
