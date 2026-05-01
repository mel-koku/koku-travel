-- Partial index for the hot locations-listing filter.
--
-- The pattern `.eq("is_active", true).or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")`
-- appears in 7+ paths (smart-prompts/recommend x5, day-trips/plan, locationSearch x2,
-- supabase/filters helper). Phase 2 audit (docs/audits/2026-05-01-phase2-api-costs/02-cost-meters.md)
-- flagged it as forcing a sequential scan of ~5,860 rows on every listing query.
--
-- A partial index on business_status restricted to is_active = true narrows the
-- working set the planner has to consider. Plain CREATE INDEX (not CONCURRENTLY)
-- because Supabase migrations run inside a transaction; at this row count the
-- brief lock is fine.

CREATE INDEX IF NOT EXISTS idx_locations_active_business_status
  ON locations (business_status)
  WHERE is_active = true;
