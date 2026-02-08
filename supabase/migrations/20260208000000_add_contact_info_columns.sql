-- Add contact info columns to locations table.
-- These will be backfilled from place_details.payload cache data
-- so the /api/locations/[id] endpoint can serve them without Google API calls.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS website_uri TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_uri TEXT;

COMMENT ON COLUMN locations.website_uri IS 'Location website URL, sourced from Google Places';
COMMENT ON COLUMN locations.phone_number IS 'International phone number, sourced from Google Places';
COMMENT ON COLUMN locations.google_maps_uri IS 'Google Maps URL for this location';
