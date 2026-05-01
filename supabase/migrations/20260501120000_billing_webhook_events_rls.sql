-- Lock down billing_webhook_events. The Stripe webhook handler uses the
-- service role client (which bypasses RLS) and process_webhook_event is
-- SECURITY DEFINER (also bypasses), so enabling RLS + revoking the default
-- Supabase grants does not affect the write path.
--
-- Without this, the default Supabase grants make the table readable via the
-- anon key. Stripe event IDs, event types, and processing timestamps were
-- all leaking. Confirmed by 2026-05-01 Phase 1 audit.

ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE billing_webhook_events FROM anon, authenticated;
