-- Document the relationship between accessibility fields
-- Legacy 'accessibility' object vs Google's 'accessibility_options'

-- Add comment explaining the legacy accessibility column
COMMENT ON COLUMN locations.accessibility IS 'DEPRECATED: Legacy accessibility structure (wheelchairAccessible, hearingLoopAvailable, stepFreeAccess, notes). Use accessibility_options for new code. Retained for backwards compatibility with existing data.';

-- Add comment explaining the Google accessibility_options column
COMMENT ON COLUMN locations.accessibility_options IS 'Google Places API accessibility data: wheelchairAccessibleEntrance, wheelchairAccessibleParking, wheelchairAccessibleRestroom, wheelchairAccessibleSeating. Preferred over legacy accessibility field.';

/*
Field Mapping Guide:
--------------------
Legacy (accessibility)           → Google (accessibility_options)
-------------------------------------------------------------------
wheelchairAccessible             → wheelchairAccessibleEntrance
hearingLoopAvailable             → (no equivalent)
stepFreeAccess                   → wheelchairAccessibleEntrance (similar concept)
notes                            → (no equivalent - use location notes)
(none)                           → wheelchairAccessibleParking
(none)                           → wheelchairAccessibleRestroom
(none)                           → wheelchairAccessibleSeating

Migration Strategy:
- New code should use accessibility_options
- Existing code can continue using legacy accessibility
- When both exist, prefer accessibility_options values
- hearingLoopAvailable and notes have no Google equivalent
*/
