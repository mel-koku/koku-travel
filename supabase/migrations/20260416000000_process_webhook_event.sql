-- Atomic webhook event processor.
-- Wraps idempotency check, trip unlock, customer upsert, and launch-slot
-- decrement in a single transaction so a crash between steps cannot leave
-- the event recorded but the trip unlocked.
CREATE OR REPLACE FUNCTION process_webhook_event(
  p_event_id        TEXT,
  p_event_type      TEXT,
  p_trip_id         UUID,
  p_user_id         UUID,
  p_tier            TEXT,
  p_stripe_session_id TEXT,
  p_amount_cents    INTEGER,
  p_customer_id     TEXT DEFAULT NULL,
  p_launch_pricing  BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  _rows_inserted INTEGER;
  _rows_updated  INTEGER;
BEGIN
  -- 1. Idempotency gate: insert event, skip if duplicate.
  INSERT INTO billing_webhook_events (event_id, event_type)
  VALUES (p_event_id, p_event_type)
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS _rows_inserted = ROW_COUNT;

  IF _rows_inserted = 0 THEN
    -- Duplicate event: already processed.
    RETURN FALSE;
  END IF;

  -- 2. Unlock the trip.
  UPDATE trips
  SET unlocked_at       = now(),
      unlock_tier       = p_tier,
      stripe_session_id = p_stripe_session_id,
      unlock_amount_cents = p_amount_cents
  WHERE id = p_trip_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;
  IF _rows_updated = 0 THEN
    RAISE EXCEPTION 'Trip % not found for user %', p_trip_id, p_user_id;
  END IF;

  -- 3. Upsert Stripe customer ID on user preferences (if provided).
  IF p_customer_id IS NOT NULL THEN
    INSERT INTO user_preferences (user_id, stripe_customer_id)
    VALUES (p_user_id, p_customer_id)
    ON CONFLICT (user_id)
    DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id;
  END IF;

  -- 4. Decrement launch pricing slot (if applicable).
  IF p_launch_pricing THEN
    PERFORM decrement_launch_slots(p_stripe_session_id);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
