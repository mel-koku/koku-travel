# Debug Notes: Itinerary Generates But No Activities Displayed

**Date:** 2026-01-30
**Status:** RESOLVED

## Issue Summary

User reports that when going through the trip builder process, the itinerary generates with days (Day 1, Day 2, etc.) but **no activities/locations are shown inside each day**.

## Root Causes Found

### 1. Region Bounding Box Overlap

The `REGION_BOUNDS` in `itineraryGenerator.ts` had overlapping boundaries:

- Chugoku and Shikoku boundaries overlapped
- Kansai and Shikoku boundaries overlapped

This caused `findRegionByCoordinates()` to classify Matsuyama/Takamatsu locations as Chugoku/Kansai (checked first in the loop) instead of Shikoku, resulting in them being filtered out.

### 2. Missing City Configuration

Cities like Matsuyama, Takamatsu, Hakodate, and Nagasaki were missing from:

- `CITY_CENTER_COORDINATES`
- `CITY_EXPECTED_REGION`

### 3. Client-Side Issues (Secondary)

- Malformed location IDs causing 404 errors
- Excessive API calls causing 429 rate limiting

## Fixes Applied

### Fix 1: Skip coordinate validation when city matches

In `isLocationValidForCity()`, if the location's city field matches the target city, trust the database and skip coordinate-based region validation.

### Fix 2: Skip coordinate validation for overlapping regions

For regions with overlapping boundaries (Shikoku, Chugoku, Kansai), skip the coordinate-based region check entirely.

### Fix 3: Add missing city configurations

Added to `CITY_CENTER_COORDINATES`:

- matsuyama: { lat: 33.8416, lng: 132.7657 }
- takamatsu: { lat: 34.3401, lng: 134.0434 }
- hakodate: { lat: 41.7687, lng: 140.7288 }
- nagasaki: { lat: 32.7503, lng: 129.8779 }

Added to `CITY_EXPECTED_REGION`:

- matsuyama: "Shikoku"
- takamatsu: "Shikoku"
- hakodate: "Hokkaido"
- nagasaki: "Kyushu"

### Fix 4: Client-side location ID handling

- Fixed regex in `useActivityLocations.ts` to properly extract location IDs
- Added validation to skip invalid IDs (entry points, fallbacks)
- Fixed `buildFallbackLocation` to use `locationId` instead of activity ID
- Added AbortController to prevent orphaned requests
- Changed useEffect dependencies to use stable identifiers

## Files Modified

- `src/lib/itineraryGenerator.ts` - Main fix for region validation
- `src/hooks/useActivityLocations.ts` - Fixed location ID extraction
- `src/hooks/useLocationDetailsQuery.ts` - Added ID validation
- `src/components/features/itinerary/PlaceActivityRow.tsx` - Fixed excessive API calls

## Verification

After fixes, Matsuyama and Takamatsu locations (23 and 20 respectively) are now included in generated itineraries.
