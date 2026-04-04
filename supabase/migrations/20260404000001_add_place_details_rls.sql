-- Migration: Add RLS to place_details table
-- Previously had no RLS ("server-side only" comment was not enforced).
-- This denies all direct access; only the service role key bypasses RLS.

ALTER TABLE place_details ENABLE ROW LEVEL SECURITY;

-- Deny all direct access (service role bypasses RLS automatically)
CREATE POLICY "Deny direct access" ON place_details
  FOR ALL
  USING (false);
