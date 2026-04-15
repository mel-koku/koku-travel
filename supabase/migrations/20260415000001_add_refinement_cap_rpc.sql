-- Atomic increment with cap. Returns the new count if we were able to
-- increment under the cap; returns NULL if the trip was already at cap.
-- This eliminates the read-check-then-increment race in /api/itinerary/refine.
CREATE OR REPLACE FUNCTION increment_free_refinements_if_under_cap(
  p_trip_id UUID,
  p_user_id UUID,
  p_max INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE trips
  SET free_refinements_used = free_refinements_used + 1
  WHERE id = p_trip_id
    AND user_id = p_user_id
    AND free_refinements_used < p_max
  RETURNING free_refinements_used INTO v_new_count;
  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement used when a reserved refinement ultimately fails (e.g. LLM error).
-- Floors at zero so accidental double-decrements don't go negative.
CREATE OR REPLACE FUNCTION decrement_free_refinements(
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE trips
  SET free_refinements_used = GREATEST(free_refinements_used - 1, 0)
  WHERE id = p_trip_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
