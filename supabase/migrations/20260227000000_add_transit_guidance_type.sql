-- Add 'transit' to the guidance_type CHECK constraint
-- New type: transit (train, subway, bus, and station-specific tips)

ALTER TABLE travel_guidance
  DROP CONSTRAINT IF EXISTS travel_guidance_guidance_type_check;

ALTER TABLE travel_guidance
  ADD CONSTRAINT travel_guidance_guidance_type_check
  CHECK (guidance_type IN (
    'etiquette', 'practical', 'environmental', 'seasonal',
    'accessibility', 'photography', 'budget', 'nightlife',
    'family', 'solo', 'food_culture', 'cultural_context',
    'transit'
  ));

COMMENT ON COLUMN travel_guidance.guidance_type IS
  'Type of guidance: etiquette (cultural), practical (how-to), environmental (sustainability), seasonal (time-specific), accessibility (mobility/needs), photography (photo tips), budget (saving money), nightlife (after-dark), family (kid-friendly), solo (solo travel), food_culture (food customs/specialties), cultural_context (deeper cultural background), transit (train/subway/bus/station tips)';
