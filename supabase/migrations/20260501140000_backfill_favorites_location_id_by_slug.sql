-- Backfill favorites.location_id where favorites.place_id is actually our
-- internal location slug (locations.id), not a Google place ID.
--
-- Phase 1 audit (docs/audits/2026-05-01-phase1-db-state/06-cross-table-integrity.md)
-- flagged 4 favorites rows with NULL location_id. Investigation showed 3 of them
-- had `place_id` set to the location's internal slug, missing the existing
-- backfill in 20260125200000 (which only matched on locations.place_id, the
-- Google place ID). The 4th is genuine legacy/orphan and stays NULL.
--
-- Pairs with the savedSync.ts code fix that adds the slug fallback to
-- lookupLocationId, preventing future drift.

UPDATE favorites f
SET location_id = l.id
FROM locations l
WHERE f.place_id = l.id
  AND f.location_id IS NULL;
