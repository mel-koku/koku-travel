-- Add month-level precision for seasonal tips.
-- valid_months int[] stores which months (1-12) a tip applies to.
-- NULL means "no month restriction" (use season-level filtering only).

ALTER TABLE travel_guidance ADD COLUMN IF NOT EXISTS valid_months int[] DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_guidance_valid_months ON travel_guidance USING GIN (valid_months);
