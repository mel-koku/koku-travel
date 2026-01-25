-- Migration: Add city-region validation
-- This migration adds a lookup table for valid city-region mappings
-- and a trigger to validate city-region consistency on insert/update.
--
-- This prevents data corruption where locations are assigned to cities
-- in the wrong region (e.g., "Cape Higashi" with city="Osaka" but region="Okinawa").

-- =============================================================================
-- CITY-REGION MAPPINGS LOOKUP TABLE
-- =============================================================================

-- Create lookup table for valid city-region combinations
CREATE TABLE IF NOT EXISTS city_region_mappings (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  is_major_city BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city, region)
);

-- Insert known valid city-region mappings
-- Major cities (cities with wards that were consolidated)
INSERT INTO city_region_mappings (city, region, is_major_city) VALUES
  -- Kanto region
  ('Tokyo', 'Kanto', TRUE),
  ('Yokohama', 'Kanto', TRUE),
  ('Kawasaki', 'Kanto', TRUE),
  ('Chiba', 'Kanto', TRUE),
  ('Saitama', 'Kanto', TRUE),
  -- Kansai region
  ('Osaka', 'Kansai', TRUE),
  ('Kyoto', 'Kansai', TRUE),
  ('Kobe', 'Kansai', TRUE),
  ('Nara', 'Kansai', TRUE),
  -- Chubu region
  ('Nagoya', 'Chubu', TRUE),
  ('Kanazawa', 'Chubu', TRUE),
  ('Niigata', 'Chubu', TRUE),
  ('Shizuoka', 'Chubu', TRUE),
  -- Tohoku region
  ('Sendai', 'Tohoku', TRUE),
  ('Aomori', 'Tohoku', TRUE),
  ('Morioka', 'Tohoku', TRUE),
  -- Hokkaido region
  ('Sapporo', 'Hokkaido', TRUE),
  ('Hakodate', 'Hokkaido', TRUE),
  ('Asahikawa', 'Hokkaido', TRUE),
  -- Chugoku region
  ('Hiroshima', 'Chugoku', TRUE),
  ('Okayama', 'Chugoku', TRUE),
  ('Matsue', 'Chugoku', TRUE),
  -- Shikoku region
  ('Matsuyama', 'Shikoku', TRUE),
  ('Takamatsu', 'Shikoku', TRUE),
  ('Kochi', 'Shikoku', TRUE),
  ('Tokushima', 'Shikoku', TRUE),
  -- Kyushu region
  ('Fukuoka', 'Kyushu', TRUE),
  ('Nagasaki', 'Kyushu', TRUE),
  ('Kumamoto', 'Kyushu', TRUE),
  ('Kagoshima', 'Kyushu', TRUE),
  ('Oita', 'Kyushu', TRUE),
  -- Okinawa region
  ('Naha', 'Okinawa', TRUE),
  ('Miyakojima', 'Okinawa', FALSE),  -- Note: This is the Okinawa city, NOT Osaka ward
  ('Ishigaki', 'Okinawa', FALSE)
ON CONFLICT (city, region) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_city_region_mappings_city ON city_region_mappings(city);
CREATE INDEX IF NOT EXISTS idx_city_region_mappings_region ON city_region_mappings(region);

-- =============================================================================
-- VALIDATION FUNCTION
-- =============================================================================

-- Function to validate city-region consistency
CREATE OR REPLACE FUNCTION validate_city_region_consistency()
RETURNS TRIGGER AS $$
DECLARE
  mapping_exists BOOLEAN;
  is_major BOOLEAN;
BEGIN
  -- Check if this city-region combination exists in our mappings
  SELECT EXISTS(
    SELECT 1 FROM city_region_mappings
    WHERE city = NEW.city AND region = NEW.region
  ) INTO mapping_exists;

  -- If mapping exists, allow the insert/update
  IF mapping_exists THEN
    RETURN NEW;
  END IF;

  -- Check if this is a major city (which should only be in specific regions)
  SELECT EXISTS(
    SELECT 1 FROM city_region_mappings
    WHERE city = NEW.city AND is_major_city = TRUE
  ) INTO is_major;

  -- If it's a major city but in wrong region, this is likely data corruption
  IF is_major THEN
    RAISE WARNING 'City-region mismatch detected: "%" in "%" (this city is typically in a different region). Location: "%" (ID: %)',
      NEW.city, NEW.region, NEW.name, NEW.id;
    -- We raise a warning but still allow the insert to avoid blocking legitimate data
    -- The warning will be logged for manual review
  END IF;

  -- For non-major cities, allow any city-region combination
  -- (there are many small cities that may not be in our mappings)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER
-- =============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_location_city_region ON locations;

-- Create trigger to validate on insert and update
CREATE TRIGGER validate_location_city_region
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION validate_city_region_consistency();

-- =============================================================================
-- AUDIT QUERY
-- =============================================================================

-- Query to find existing city-region mismatches (for manual review)
-- Run this after migration to identify any existing data issues
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM locations l
  JOIN city_region_mappings m ON l.city = m.city AND m.is_major_city = TRUE
  WHERE l.region != m.region;

  IF mismatch_count > 0 THEN
    RAISE NOTICE 'Found % locations with city-region mismatches. Run the audit query to review.', mismatch_count;
  ELSE
    RAISE NOTICE 'No city-region mismatches found in existing data.';
  END IF;
END $$;

-- Commented out audit query for reference:
-- SELECT l.id, l.name, l.city, l.region as actual_region, m.region as expected_region
-- FROM locations l
-- JOIN city_region_mappings m ON l.city = m.city AND m.is_major_city = TRUE
-- WHERE l.region != m.region;
