-- Location multi-photo system (Phase 1A).
-- Design doc: docs/superpowers/plans/2026-04-08-location-multi-photo-system.md
--
-- Stores multiple photos per location. Phase 1 backfills from Google Places;
-- Phase 2 adds curated uploads; Phase 3 adds community uploads. Single table
-- serves all three, distinguished by `source`.

CREATE TABLE IF NOT EXISTS location_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  photo_name  text NOT NULL,
  source      text NOT NULL CHECK (source IN ('google', 'curated', 'community')),
  sort_order  int NOT NULL DEFAULT 0,
  width_px    int,
  height_px   int,
  attribution text,
  is_hero     boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderation  text NOT NULL DEFAULT 'approved'
    CHECK (moderation IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (location_id, photo_name)
);

-- Fast ordered fetch for cards (top N photos per location, approved only)
CREATE INDEX IF NOT EXISTS idx_location_photos_location_sort
  ON location_photos(location_id, sort_order)
  WHERE moderation = 'approved';

-- Quick hero lookup
CREATE INDEX IF NOT EXISTS idx_location_photos_hero
  ON location_photos(location_id)
  WHERE is_hero = true AND moderation = 'approved';

-- Filter by origin (curation tools)
CREATE INDEX IF NOT EXISTS idx_location_photos_source
  ON location_photos(source);

-- Moderation queue (Phase 3)
CREATE INDEX IF NOT EXISTS idx_location_photos_moderation_pending
  ON location_photos(created_at)
  WHERE moderation = 'pending';

-- updated_at trigger (reuse existing helper from locations)
CREATE TRIGGER set_location_photos_updated_at
  BEFORE UPDATE ON location_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE location_photos ENABLE ROW LEVEL SECURITY;

-- Public read: only approved photos visible to anon clients
CREATE POLICY "location_photos_public_read" ON location_photos
  FOR SELECT USING (moderation = 'approved');

-- Authenticated users can insert their own community uploads (Phase 3).
-- Enforces: source must be 'community', uploaded_by must match the caller,
-- moderation must start as 'pending' so nothing auto-publishes.
CREATE POLICY "location_photos_community_insert" ON location_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    source = 'community'
    AND uploaded_by = auth.uid()
    AND moderation = 'pending'
  );

-- Authenticated users can delete their own uploads (takedown right)
CREATE POLICY "location_photos_community_delete" ON location_photos
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Service role bypasses RLS for harvest scripts + admin curation (no policy needed).
