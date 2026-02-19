-- Expand guidance_type CHECK constraint to support 8 new types
-- New types: accessibility, photography, budget, nightlife, family, solo, food_culture, cultural_context

ALTER TABLE travel_guidance
  DROP CONSTRAINT IF EXISTS travel_guidance_guidance_type_check;

ALTER TABLE travel_guidance
  ADD CONSTRAINT travel_guidance_guidance_type_check
  CHECK (guidance_type IN (
    'etiquette', 'practical', 'environmental', 'seasonal',
    'accessibility', 'photography', 'budget', 'nightlife',
    'family', 'solo', 'food_culture', 'cultural_context'
  ));

COMMENT ON COLUMN travel_guidance.guidance_type IS
  'Type of guidance: etiquette (cultural), practical (how-to), environmental (sustainability), seasonal (time-specific), accessibility (mobility/needs), photography (photo tips), budget (saving money), nightlife (after-dark), family (kid-friendly), solo (solo travel), food_culture (food customs/specialties), cultural_context (deeper cultural background)';
