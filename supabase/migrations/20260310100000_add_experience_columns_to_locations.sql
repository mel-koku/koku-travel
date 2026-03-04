-- Add experience-specific columns to locations table
-- Allows experience locations to live in the same table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS experience_type text;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source_category text;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS sanity_slug text;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_editorial boolean DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS best_season text[];
ALTER TABLE locations ADD COLUMN IF NOT EXISTS booking_url text;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS meeting_point text;
