-- Add Google Places enrichment columns to locations table
-- These columns store additional data from Google Places API for better filtering and categorization

-- Primary type from Google Places (e.g., "buddhist_temple", "castle", "restaurant")
-- This provides more accurate categorization than our generic categories
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_primary_type text;

-- Array of all types from Google Places (a location can have multiple types)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_types text[];

-- Business status: OPERATIONAL, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED
-- Used to filter out closed locations from itinerary planning
ALTER TABLE locations ADD COLUMN IF NOT EXISTS business_status text;

-- Price level from Google Places (1-4)
-- 1 = Inexpensive ($), 2 = Moderate ($$), 3 = Expensive ($$$), 4 = Very Expensive ($$$$)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS price_level smallint;

-- Accessibility options from Google Places
-- Stores: wheelchairAccessibleEntrance, wheelchairAccessibleParking,
--         wheelchairAccessibleRestroom, wheelchairAccessibleSeating
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accessibility_options jsonb;

-- Dietary options from Google Places
-- Stores: servesVegetarianFood
ALTER TABLE locations ADD COLUMN IF NOT EXISTS dietary_options jsonb;

-- Service options from Google Places (for restaurants/food places)
-- Stores: dineIn, takeout, delivery
ALTER TABLE locations ADD COLUMN IF NOT EXISTS service_options jsonb;

-- Meal options from Google Places (for restaurants)
-- Stores: servesBreakfast, servesBrunch, servesLunch, servesDinner
ALTER TABLE locations ADD COLUMN IF NOT EXISTS meal_options jsonb;

-- Create indexes for commonly filtered columns
CREATE INDEX IF NOT EXISTS idx_locations_google_primary_type ON locations (google_primary_type);
CREATE INDEX IF NOT EXISTS idx_locations_business_status ON locations (business_status);
CREATE INDEX IF NOT EXISTS idx_locations_price_level ON locations (price_level);

-- Partial index for wheelchair accessible locations
CREATE INDEX IF NOT EXISTS idx_locations_wheelchair_accessible
ON locations ((accessibility_options->>'wheelchairAccessibleEntrance'))
WHERE accessibility_options->>'wheelchairAccessibleEntrance' = 'true';

-- Partial index for vegetarian-friendly locations
CREATE INDEX IF NOT EXISTS idx_locations_vegetarian
ON locations ((dietary_options->>'servesVegetarianFood'))
WHERE dietary_options->>'servesVegetarianFood' = 'true';

-- Comment on columns for documentation
COMMENT ON COLUMN locations.google_primary_type IS 'Primary type from Google Places API (e.g., buddhist_temple, castle, restaurant)';
COMMENT ON COLUMN locations.google_types IS 'Array of all types from Google Places API';
COMMENT ON COLUMN locations.business_status IS 'Business status: OPERATIONAL, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED';
COMMENT ON COLUMN locations.price_level IS 'Price level 1-4 ($ to $$$$)';
COMMENT ON COLUMN locations.accessibility_options IS 'JSON: wheelchairAccessibleEntrance, wheelchairAccessibleParking, wheelchairAccessibleRestroom, wheelchairAccessibleSeating';
COMMENT ON COLUMN locations.dietary_options IS 'JSON: servesVegetarianFood';
COMMENT ON COLUMN locations.service_options IS 'JSON: dineIn, takeout, delivery';
COMMENT ON COLUMN locations.meal_options IS 'JSON: servesBreakfast, servesBrunch, servesLunch, servesDinner';
