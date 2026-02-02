-- Create travel_guidance table for responsible travel tips and etiquette guidance
-- Phase 1: MVP - Surface AI-extracted etiquette tips on activity cards

CREATE TABLE travel_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  summary TEXT NOT NULL,  -- Short (max 200 chars) for inline tips
  content TEXT,           -- Full content for detail view
  icon TEXT,              -- Emoji or Lucide icon name

  -- Categorization
  guidance_type TEXT NOT NULL CHECK (guidance_type IN ('etiquette', 'practical', 'environmental', 'seasonal')),
  tags TEXT[] DEFAULT '{}',

  -- Matching criteria
  categories TEXT[] DEFAULT '{}',       -- Location categories ['temple', 'shrine']
  regions TEXT[] DEFAULT '{}',          -- Region-specific tips
  cities TEXT[] DEFAULT '{}',           -- City-specific tips
  location_ids TEXT[] DEFAULT '{}',     -- Specific location IDs
  seasons TEXT[] DEFAULT '{}',          -- Season-specific tips ['spring', 'summer', 'fall', 'winter']

  -- Targeting
  is_universal BOOLEAN DEFAULT false,   -- Applies to all activities
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Attribution
  source_name TEXT,
  source_url TEXT,

  -- Management
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient matching queries
CREATE INDEX idx_travel_guidance_status ON travel_guidance(status);
CREATE INDEX idx_travel_guidance_guidance_type ON travel_guidance(guidance_type);
CREATE INDEX idx_travel_guidance_is_universal ON travel_guidance(is_universal);
CREATE INDEX idx_travel_guidance_priority ON travel_guidance(priority DESC);

-- GIN indexes for array matching
CREATE INDEX idx_travel_guidance_categories ON travel_guidance USING GIN(categories);
CREATE INDEX idx_travel_guidance_regions ON travel_guidance USING GIN(regions);
CREATE INDEX idx_travel_guidance_cities ON travel_guidance USING GIN(cities);
CREATE INDEX idx_travel_guidance_tags ON travel_guidance USING GIN(tags);
CREATE INDEX idx_travel_guidance_seasons ON travel_guidance USING GIN(seasons);
CREATE INDEX idx_travel_guidance_location_ids ON travel_guidance USING GIN(location_ids);

-- Enable RLS
ALTER TABLE travel_guidance ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published guidance
CREATE POLICY "Anyone can read published travel guidance"
  ON travel_guidance
  FOR SELECT
  USING (status = 'published');

-- Add comment for documentation
COMMENT ON TABLE travel_guidance IS 'Responsible travel tips and etiquette guidance for Japan travel. Tips are matched to activities based on categories, regions, cities, and tags.';
COMMENT ON COLUMN travel_guidance.summary IS 'Short tip text (max 200 chars) displayed inline on activity cards';
COMMENT ON COLUMN travel_guidance.content IS 'Full detailed content for expanded/detail views';
COMMENT ON COLUMN travel_guidance.guidance_type IS 'Type of guidance: etiquette (cultural), practical (how-to), environmental (sustainability), seasonal (time-specific)';
COMMENT ON COLUMN travel_guidance.categories IS 'Location categories this tip applies to, e.g. temple, shrine, restaurant, transit';
COMMENT ON COLUMN travel_guidance.is_universal IS 'If true, tip applies to all activities regardless of matching criteria';
COMMENT ON COLUMN travel_guidance.priority IS 'Display priority 1-10, higher = more important and shown first';
