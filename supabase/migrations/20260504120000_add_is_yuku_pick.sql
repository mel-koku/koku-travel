-- Smart Guidebook Stage 0: per-place Yuku Pick badge.
--
-- Adds a `is_yuku_pick` flag to `locations` so the editor can mark ~30-40
-- top picks across the launch corpus. Selection is algorithmic + human-
-- curated (see Stage 1 of the SG plan: composite-score shortlist + mel
-- accept/reject CSV pass).
--
-- Index is partial (WHERE is_yuku_pick = true) because:
--   - <1% of rows will ever be true (~30-40 of ~5,977 active locations)
--   - The hot read pattern is "give me the picks for this region/city",
--     which scans the small subset directly via the partial index
--   - Full-table predicate index would waste storage on the false majority
--
-- RLS: covered by the existing `locations` policies (public read, service-
-- role write). Verification test in `scripts/verify-is-yuku-pick-rls.mjs`
-- (sibling to this migration). Run after `npx supabase db push`.
--
-- Editor notes do NOT live here. Per SG eng review they're stored in Sanity
-- (`editorNote` doc type referencing `locations` by slug). Single source of
-- truth.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS is_yuku_pick boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_locations_yuku_pick
  ON locations (is_yuku_pick)
  WHERE is_yuku_pick = true;
