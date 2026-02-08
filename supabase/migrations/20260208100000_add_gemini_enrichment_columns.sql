-- Add columns for Gemini-sourced enrichment data.
-- These will be populated via batch prompts to Gemini, not Google API calls.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS name_japanese TEXT,
  ADD COLUMN IF NOT EXISTS nearest_station TEXT,
  ADD COLUMN IF NOT EXISTS cash_only BOOLEAN,
  ADD COLUMN IF NOT EXISTS reservation_info TEXT;

COMMENT ON COLUMN locations.name_japanese IS 'Japanese name (日本語名) — useful for taxi drivers, signs, Japanese map searches';
COMMENT ON COLUMN locations.nearest_station IS 'Nearest train/subway station and walking time, e.g. "Kiyomizu-Gojo Station (5 min walk)"';
COMMENT ON COLUMN locations.cash_only IS 'True if the location only accepts cash (no credit cards)';
COMMENT ON COLUMN locations.reservation_info IS 'Reservation status: "required", "recommended", or null if not needed/unknown';
