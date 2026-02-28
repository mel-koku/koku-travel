-- Add tattoo policy column to locations table
-- Values: 'prohibited' (most traditional onsen), 'cover_required' (sticker/cover OK), 'accepted' (tattoo-friendly)
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS tattoo_policy text
  CHECK (tattoo_policy IN ('prohibited', 'cover_required', 'accepted'));

-- Index on non-null values for filtering
CREATE INDEX IF NOT EXISTS idx_locations_tattoo_policy
  ON locations (tattoo_policy)
  WHERE tattoo_policy IS NOT NULL;
