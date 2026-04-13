-- Lock the `location-photos` bucket.
--
-- Background: the bucket was created public (2026-02-08) when the enrichment
-- pipeline downloaded Google Places photo bytes to it and served the resulting
-- public URLs from `locations.primary_photo_url`. That pattern violates Google
-- Places TOS §3.2.3 ("no caching or storage of Content"), so the pipeline was
-- rewritten on 2026-04-13 to persist only `photo_name` references in
-- `location_photos` and serve live via `/api/places/photo`. All 663 stale
-- Supabase-Storage URLs on `locations.primary_photo_url` were nulled.
--
-- The bucket is no longer referenced by any application code or DB column.
-- Remove the public SELECT policy and mark the bucket private so externally-
-- cached URLs (browser history, crawlers, Slack pastes) stop serving the
-- orphaned binaries. The binaries themselves are left in place — recovery is
-- a policy flip, not a restore.
--
-- Phase 2 curated uploads (per the multi-photo plan) will re-enable access
-- via signed URLs rather than public read.

UPDATE storage.buckets
SET public = false
WHERE id = 'location-photos';

DROP POLICY IF EXISTS "Public read access for location photos" ON storage.objects;
