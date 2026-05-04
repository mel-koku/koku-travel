-- Add pre-trip prep checklist state column.
-- JSONB object keyed by PrepItemId (see src/data/prepChecklist.ts). Missing
-- keys default to unchecked on the read side. Only written via the endpoint
-- /api/trips/[id]/prep-state.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS prep_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.trips.prep_state IS
  'Pre-trip prep checklist completion. Keys are PrepItemId strings; values are boolean. Missing keys default to false. Only written via /api/trips/[id]/prep-state.';
