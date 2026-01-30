-- Enable RLS on city_region_mappings and location_availability tables
-- These are public reference tables, so we add read-only policies for everyone

-- ============================================
-- city_region_mappings table
-- ============================================
ALTER TABLE city_region_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "City region mappings are viewable by everyone"
  ON city_region_mappings
  FOR SELECT
  USING (true);

-- ============================================
-- location_availability table
-- ============================================
ALTER TABLE location_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Location availability is viewable by everyone"
  ON location_availability
  FOR SELECT
  USING (true);
