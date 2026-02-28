-- Activity ratings: users rate activities on their itineraries (1–5 stars)
CREATE TABLE IF NOT EXISTS activity_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL,
  day_id text NOT NULL,
  activity_id text NOT NULL,
  location_id text,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text CHECK (char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trip_id, activity_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_ratings_trip ON activity_ratings (trip_id);
CREATE INDEX IF NOT EXISTS idx_activity_ratings_location ON activity_ratings (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_ratings_user ON activity_ratings (user_id);

-- RLS
ALTER TABLE activity_ratings ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own ratings
CREATE POLICY "Users manage own ratings"
  ON activity_ratings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for aggregate queries (community scoring)
CREATE POLICY "Public read ratings"
  ON activity_ratings
  FOR SELECT
  USING (true);

-- RPC for batch community rating aggregation
CREATE OR REPLACE FUNCTION get_community_ratings(p_location_ids text[])
RETURNS TABLE (location_id text, avg_rating numeric, rating_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    ar.location_id,
    ROUND(AVG(ar.rating)::numeric, 2) AS avg_rating,
    COUNT(*) AS rating_count
  FROM activity_ratings ar
  WHERE ar.location_id = ANY(p_location_ids)
    AND ar.location_id IS NOT NULL
  GROUP BY ar.location_id
  HAVING COUNT(*) >= 3
$$;
