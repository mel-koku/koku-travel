-- Add seasons column to guides table for seasonal awareness
ALTER TABLE guides ADD COLUMN IF NOT EXISTS seasons text[] DEFAULT NULL;

-- Index for seasonal queries (contains operator)
CREATE INDEX IF NOT EXISTS idx_guides_seasons ON guides USING GIN (seasons);
