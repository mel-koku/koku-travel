-- Track processed Stripe webhook events for idempotency.
-- Stripe retries use the same event.id, so a PK uniqueness constraint
-- makes INSERT ... ON CONFLICT DO NOTHING a safe idempotency gate.
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_processed_at
  ON billing_webhook_events(processed_at);

-- Email delivery status fields on trips. unlock_email_sent_at is set on
-- successful Resend send; unlock_email_error holds the truncated error
-- message on failure so support can re-send manually.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS unlock_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlock_email_error TEXT;
