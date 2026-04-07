-- Add Trip Pass fields to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlock_tier TEXT CHECK (unlock_tier IN ('short', 'standard', 'long')),
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS unlock_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS free_refinements_used INTEGER NOT NULL DEFAULT 0;

-- Index for finding unlocked trips (analytics, founding-member queries)
CREATE INDEX IF NOT EXISTS idx_trips_unlocked
  ON trips(unlocked_at) WHERE unlocked_at IS NOT NULL;

-- Stripe customer ID on user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Launch pricing counter table
CREATE TABLE IF NOT EXISTS launch_pricing (
  id TEXT PRIMARY KEY DEFAULT 'default',
  total_slots INTEGER NOT NULL DEFAULT 100,
  remaining_slots INTEGER NOT NULL DEFAULT 100
);

-- Seed with 100 launch pricing slots
INSERT INTO launch_pricing (id, total_slots, remaining_slots)
VALUES ('default', 100, 100)
ON CONFLICT (id) DO NOTHING;

-- Access log for refund exception checks
CREATE TABLE IF NOT EXISTS trip_day_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_day_access_log_trip
  ON trip_day_access_log(trip_id);

-- RLS: users can only insert/read their own access logs
ALTER TABLE trip_day_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own access logs"
  ON trip_day_access_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own access logs"
  ON trip_day_access_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RPC to atomically decrement launch pricing slots
CREATE OR REPLACE FUNCTION decrement_launch_slots()
RETURNS void AS $$
BEGIN
  UPDATE launch_pricing
  SET remaining_slots = GREATEST(remaining_slots - 1, 0)
  WHERE id = 'default' AND remaining_slots > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to increment free refinements used
CREATE OR REPLACE FUNCTION increment_free_refinements(p_trip_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE trips
  SET free_refinements_used = free_refinements_used + 1
  WHERE id = p_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
