-- Follow-up to 20260413000000_create_location_photos.sql.
--
-- Two gaps identified before running the Google Places harvest:
--
-- 1. attribution_uri: Google Places TOS requires a clickable link back to the
--    photographer's profile when displaying their photo. The `attribution` text
--    column captures the display name only; without the URI we can't render the
--    required link.
--
-- 2. last_fetched_at: Photos can be deleted or replaced on Google's side. We
--    need a timestamp to drive re-fetch ("refresh photos older than N months")
--    and to debug staleness. Every other enrichment system in this repo has one.
--
-- Also documents the dual meaning of `photo_name`:
--   - source='google'    → opaque Google Places photo resource name
--                          (`places/{place_id}/photos/{photo_ref}`)
--   - source='curated'   → Supabase Storage path within `location-photos` bucket
--   - source='community' → Supabase Storage path within `location-photos` bucket
-- The `/api/places/photo` proxy branches on this format.

ALTER TABLE location_photos
  ADD COLUMN IF NOT EXISTS attribution_uri   text,
  ADD COLUMN IF NOT EXISTS last_fetched_at   timestamptz;

COMMENT ON COLUMN location_photos.photo_name IS
  'Google Places photo resource name when source=google; Supabase Storage path within location-photos bucket when source=curated or community.';

COMMENT ON COLUMN location_photos.attribution IS
  'Display name of photographer / uploader. Pair with attribution_uri for a clickable credit.';

COMMENT ON COLUMN location_photos.attribution_uri IS
  'Link back to photographer profile (Google Maps profile for source=google) or uploader profile (curated/community). Required by Google Places TOS for source=google.';

COMMENT ON COLUMN location_photos.last_fetched_at IS
  'When this row was last refreshed from its upstream source. Drives the harvest re-fetch cadence.';
