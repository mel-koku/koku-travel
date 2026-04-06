-- Add valid_months to locations for month-level seasonal availability.
-- Complements the existing is_seasonal + location_availability system
-- (which handles specific dates) with a simpler month-level guard for
-- businesses that operate seasonally (whale watching Apr-Oct, ski resorts
-- Dec-Mar, outdoor onsen May-Nov, etc.).
--
-- NULL = available year-round (default). Non-null = only available in
-- listed months. Scoring pipeline uses this as a hard filter: locations
-- outside their valid months get excluded from time slot selection.
--
-- Same pattern as travel_guidance.valid_months.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS valid_months int[];

-- No backfill needed. Seasonal locations will be tagged incrementally.
-- The column is nullable (NULL = year-round), so existing locations are unaffected.

COMMENT ON COLUMN locations.valid_months IS 'Months (1-12) when this location is operational. NULL = year-round. Used by scoring pipeline as hard filter.';
