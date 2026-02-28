-- Add insider_tip column to locations table
-- Stores curated insider tips for top-rated locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS insider_tip text;

-- Comment for documentation
COMMENT ON COLUMN locations.insider_tip IS 'Curated insider tip — local knowledge, hidden features, or best practices for this location';
