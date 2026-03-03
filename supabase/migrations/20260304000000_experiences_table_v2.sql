-- Add columns to existing experiences table for unified experience browsing
-- Adds craft, tags, editorial linking, and browse-quality metadata

-- New columns for unified experiences
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS craft_type text;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS sanity_slug text;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS has_editorial boolean DEFAULT false;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS best_season text[];
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS booking_url text;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS meeting_point text;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS is_hidden_gem boolean DEFAULT false;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS insider_tip text;

-- Indexes for browse queries
CREATE INDEX IF NOT EXISTS idx_experiences_experience_type ON experiences (experience_type);
CREATE INDEX IF NOT EXISTS idx_experiences_craft_type ON experiences (craft_type);
CREATE INDEX IF NOT EXISTS idx_experiences_city ON experiences (city);
CREATE INDEX IF NOT EXISTS idx_experiences_region ON experiences (region);
CREATE INDEX IF NOT EXISTS idx_experiences_sanity_slug ON experiences (sanity_slug);
CREATE INDEX IF NOT EXISTS idx_experiences_tags ON experiences USING GIN (tags);
