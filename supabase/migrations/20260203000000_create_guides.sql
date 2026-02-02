-- Create guides table for AI-generated travel guides and articles
-- Phase: Initial implementation with 15-20 test guides

CREATE TABLE guides (
  -- Use slug-based ID for SEO-friendly URLs
  id TEXT PRIMARY KEY,

  -- Content
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT NOT NULL,           -- Short summary for cards (max 200 chars)
  body TEXT NOT NULL,              -- Full markdown content
  featured_image TEXT NOT NULL,    -- Hero image URL
  thumbnail_image TEXT,            -- Optional card thumbnail (falls back to featured_image)

  -- Categorization
  guide_type TEXT NOT NULL CHECK (guide_type IN ('itinerary', 'listicle', 'deep_dive', 'seasonal')),
  tags TEXT[] DEFAULT '{}',

  -- Location linking
  city TEXT,                       -- Primary city (lowercase for matching)
  region TEXT,                     -- Primary region
  location_ids TEXT[] DEFAULT '{}', -- Linked location IDs from locations table

  -- Metadata
  reading_time_minutes INTEGER,
  author TEXT DEFAULT 'Koku Travel',

  -- Publishing
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,  -- Featured on homepage
  sort_order INTEGER DEFAULT 0,    -- For manual ordering

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ         -- When first published
);

-- Indexes for common queries
CREATE INDEX idx_guides_status ON guides(status);
CREATE INDEX idx_guides_guide_type ON guides(guide_type);
CREATE INDEX idx_guides_city ON guides(city);
CREATE INDEX idx_guides_region ON guides(region);
CREATE INDEX idx_guides_featured ON guides(featured) WHERE featured = true;
CREATE INDEX idx_guides_sort_order ON guides(sort_order);
CREATE INDEX idx_guides_published_at ON guides(published_at DESC);

-- GIN indexes for array fields
CREATE INDEX idx_guides_tags ON guides USING GIN(tags);
CREATE INDEX idx_guides_location_ids ON guides USING GIN(location_ids);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published guides
CREATE POLICY "Anyone can read published guides"
  ON guides
  FOR SELECT
  USING (status = 'published');

-- Note: guide_bookmarks table already exists from a previous migration
-- Add foreign key constraint to link guide_bookmarks.guide_id to guides.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guide_bookmarks_guide_id_fkey'
  ) THEN
    ALTER TABLE guide_bookmarks
      ADD CONSTRAINT guide_bookmarks_guide_id_fkey
      FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Documentation
COMMENT ON TABLE guides IS 'AI-generated travel guides and articles for Japan travel';
COMMENT ON COLUMN guides.id IS 'Slug-based ID for SEO-friendly URLs (e.g., "3-things-to-do-in-kyoto")';
COMMENT ON COLUMN guides.guide_type IS 'Type of guide: itinerary (day plans), listicle (numbered lists), deep_dive (in-depth topic), seasonal (time-specific)';
COMMENT ON COLUMN guides.location_ids IS 'Array of location IDs from locations table for linked location cards';
COMMENT ON COLUMN guides.featured IS 'If true, guide appears in featured section on homepage';
-- guide_bookmarks table already has RLS and policies configured
