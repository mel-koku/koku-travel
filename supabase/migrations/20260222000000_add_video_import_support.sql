-- Add source tracking columns to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source_url text DEFAULT NULL;

-- Partial index for community-sourced locations
CREATE INDEX IF NOT EXISTS idx_locations_source ON locations (source) WHERE source IS NOT NULL;

-- Video imports tracking table
CREATE TABLE IF NOT EXISTS video_imports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  platform text NOT NULL,
  video_title text,
  location_id text REFERENCES locations(id),
  status text NOT NULL DEFAULT 'pending',
  extraction_data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_url)
);

-- Enable RLS on video_imports
ALTER TABLE video_imports ENABLE ROW LEVEL SECURITY;

-- Users can read their own imports
CREATE POLICY "Users can read own imports"
  ON video_imports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own imports
CREATE POLICY "Users can insert own imports"
  ON video_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all imports (for the API endpoint)
CREATE POLICY "Service role manages all imports"
  ON video_imports FOR ALL
  USING (auth.role() = 'service_role');

-- Index for daily limit check
CREATE INDEX IF NOT EXISTS idx_video_imports_user_created
  ON video_imports (user_id, created_at DESC);
