-- Add planning_city column for itinerary planner queries.
-- Assigned by nearest KnownCityId center (coordinate snap).
-- Replaces city-field matching which breaks on JTA micro-city tags.
ALTER TABLE locations ADD COLUMN IF NOT EXISTS planning_city text;

CREATE INDEX IF NOT EXISTS idx_locations_planning_city ON locations (planning_city);
