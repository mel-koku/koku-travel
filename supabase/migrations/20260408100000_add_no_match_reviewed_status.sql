-- Add 'no_match_reviewed' to enrichment_status CHECK constraint.
-- Used for locations that have been manually audited and confirmed to have
-- no Google Places presence. Prevents wasting API budget on repeated retries.
-- See: scripts/fix-no-match-triage.js

ALTER TABLE locations
  DROP CONSTRAINT locations_enrichment_status_check,
  ADD CONSTRAINT locations_enrichment_status_check
    CHECK (enrichment_status IN ('pending', 'enriched', 'partial', 'no_match', 'no_match_reviewed', 'error'));
