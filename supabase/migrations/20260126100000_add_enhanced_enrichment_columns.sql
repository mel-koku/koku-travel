-- Add enhanced enrichment columns to locations table
-- These columns store additional Google Places data for itinerary scoring and filtering

-- Family/group suitability
ALTER TABLE locations ADD COLUMN IF NOT EXISTS good_for_children boolean;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS good_for_groups boolean;

-- Venue options
ALTER TABLE locations ADD COLUMN IF NOT EXISTS outdoor_seating boolean;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS reservable boolean;

-- Enhanced description from Google
ALTER TABLE locations ADD COLUMN IF NOT EXISTS editorial_summary text;

-- Create indexes for family-friendly filtering
CREATE INDEX IF NOT EXISTS idx_locations_good_for_children
ON locations (good_for_children) WHERE good_for_children = true;

CREATE INDEX IF NOT EXISTS idx_locations_good_for_groups
ON locations (good_for_groups) WHERE good_for_groups = true;
