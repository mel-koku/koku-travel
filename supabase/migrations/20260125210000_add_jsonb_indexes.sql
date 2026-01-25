-- Add partial indexes for JSONB columns to improve query performance
-- These indexes support filtering by meal options and accessibility features

-- Meal options indexes (for filtering restaurants by meal type)
CREATE INDEX IF NOT EXISTS idx_locations_serves_breakfast
ON locations ((meal_options->>'servesBreakfast'))
WHERE meal_options->>'servesBreakfast' = 'true';

CREATE INDEX IF NOT EXISTS idx_locations_serves_lunch
ON locations ((meal_options->>'servesLunch'))
WHERE meal_options->>'servesLunch' = 'true';

CREATE INDEX IF NOT EXISTS idx_locations_serves_dinner
ON locations ((meal_options->>'servesDinner'))
WHERE meal_options->>'servesDinner' = 'true';

CREATE INDEX IF NOT EXISTS idx_locations_serves_brunch
ON locations ((meal_options->>'servesBrunch'))
WHERE meal_options->>'servesBrunch' = 'true';

-- Additional accessibility indexes (wheelchair index already exists)
CREATE INDEX IF NOT EXISTS idx_locations_wheelchair_parking
ON locations ((accessibility_options->>'wheelchairAccessibleParking'))
WHERE accessibility_options->>'wheelchairAccessibleParking' = 'true';

CREATE INDEX IF NOT EXISTS idx_locations_wheelchair_restroom
ON locations ((accessibility_options->>'wheelchairAccessibleRestroom'))
WHERE accessibility_options->>'wheelchairAccessibleRestroom' = 'true';

CREATE INDEX IF NOT EXISTS idx_locations_wheelchair_seating
ON locations ((accessibility_options->>'wheelchairAccessibleSeating'))
WHERE accessibility_options->>'wheelchairAccessibleSeating' = 'true';

-- Comments explaining index usage
COMMENT ON INDEX idx_locations_serves_breakfast IS 'Partial index for filtering locations that serve breakfast';
COMMENT ON INDEX idx_locations_serves_lunch IS 'Partial index for filtering locations that serve lunch';
COMMENT ON INDEX idx_locations_serves_dinner IS 'Partial index for filtering locations that serve dinner';
COMMENT ON INDEX idx_locations_serves_brunch IS 'Partial index for filtering locations that serve brunch';
COMMENT ON INDEX idx_locations_wheelchair_parking IS 'Partial index for wheelchair accessible parking';
COMMENT ON INDEX idx_locations_wheelchair_restroom IS 'Partial index for wheelchair accessible restroom';
COMMENT ON INDEX idx_locations_wheelchair_seating IS 'Partial index for wheelchair accessible seating';
