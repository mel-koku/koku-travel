-- Adds a durable signal for free-promo unlocks. Written by POST /api/trips
-- after saveTrip() succeeds when isFullAccessEnabled() is true and the trip
-- has a generated itinerary. See docs/superpowers/specs/2026-04-19-launch-pricing-honesty-design.md.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS free_unlocked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trips_free_unlocked
  ON trips(free_unlocked_at) WHERE free_unlocked_at IS NOT NULL;
