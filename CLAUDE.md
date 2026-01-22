# Koku Travel - Project Context for Claude

## Overview

Koku Travel is a Japan travel planning application built with Next.js 15 (App Router), TypeScript, Supabase, and Tailwind CSS. It helps users plan itineraries with features like location exploration, trip building, and itinerary generation.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **State Management**: React Context (AppState, TripBuilderContext), React Query
- **Maps**: Mapbox GL
- **Testing**: Vitest
- **Caching**: React Query (@tanstack/react-query)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   └── (pages)/           # Page components
├── components/            # React components
│   ├── features/          # Feature-specific components
│   └── ui/                # Reusable UI components
├── context/               # React contexts
├── data/                  # Static data (interests, entry points)
├── hooks/                 # Custom React hooks (NEW)
│   └── useLocationDetailsQuery.ts  # React Query hook for location details
├── lib/                   # Utilities and services
│   ├── api/               # API utilities (middleware, rate limiting, pagination)
│   ├── supabase/          # Supabase client + column projections
│   └── routing/           # Route calculation utilities
├── providers/             # React providers (NEW)
│   └── QueryProvider.tsx  # React Query provider
├── services/              # Domain services
│   ├── sync/              # Supabase sync operations
│   └── trip/              # Trip CRUD and edit history
├── state/                 # Global state (AppState)
└── types/                 # TypeScript type definitions
```

## Improvement Plan Progress

### Priority 1: Critical (COMPLETED)

- [x] **Security vulnerabilities fixed**
- [x] **Code quality fixes**
- [x] **API standardization**
- [x] **Database indexes** - `20260121_add_performance_indexes.sql`

### Priority 2: High (COMPLETED)

- [x] **Refactored AppState.tsx** - Split to services
- [x] **Added tests for extracted services**
- [x] **Consolidated caching with React Query** (Jan 2026)

### Performance Refactoring (COMPLETED - Jan 2026)

All 9 phases implemented:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | React.memo() on LocationCard, SortableActivity, PlaceActivityRow, ActivityRow | ✅ |
| 2 | TripBuilderContext value memoization with useMemo | ✅ |
| 3 | Column projections replacing .select("*") | ✅ |
| 4 | City-based filtering to reduce memory in pagination | ✅ |
| 5 | Database indexes for favorites, bookmarks, place_details | ✅ |
| 6 | Lazy loading modals (LocationDetailsModal, FiltersModal, etc.) | ✅ |
| 7 | FeaturedLocationsHero image optimization with next/image | ✅ |
| 8 | React Query cache consolidation | ✅ |
| 9 | Rate limiting on /api/itinerary/availability | ✅ |

### Photo Loading Optimization (✅ COMPLETE - Jan 22, 2026)

**Problem:** N+1 query waterfall causing visible lag when loading location photos on explore page.
- Each LocationCard fetched primary photo individually from `/api/locations/[id]/primary-photo`
- Each request made external call to Google Places API
- Photos loaded sequentially as user scrolled, creating visible lag

**Solution:** Store primary photo URLs directly in database (IMPLEMENTED)

**Implementation Status:**
- ✅ Database migration created (`20260122_add_primary_photo_url.sql`)
- ✅ Location type updated with `primaryPhotoUrl` field
- ✅ Column projections updated (`LOCATION_LISTING_COLUMNS`)
- ✅ API route updated to return `primaryPhotoUrl`
- ✅ LocationCard component updated (removed ~200 lines of photo fetching code)
- ✅ Enrichment script created (`scripts/enrich-location-photos.ts`)
- ✅ Migration applied to database (Jan 22, 2026)
- ✅ **COMPLETE**: Photo enrichment completed (Jan 22, 2026)
  - **2,846 out of 2,916 locations** (97.5%) enriched with Google Places photos
  - 70 locations had no photos available (will use fallback images)
  - Note: 8 low-quality entries were later deleted in data cleanup

**✅ ALL IMPLEMENTATION COMPLETE:**
1. ✅ Database migration applied (Jan 22, 2026)
2. ✅ Photo enrichment completed (Jan 22, 2026)
   - Processed in 6 batches for reliability
   - 2,846 locations enriched with Google Places photos
   - 78 locations using fallback images (no photos available from API)
   - 4 locations skipped (invalid Place IDs)

**Next Step: Verification**
1. Visit the explore page: http://localhost:3000/explore
2. Verify that:
   - Photos load instantly (no more lag!)
   - All location cards display images properly
   - No broken images or loading spinners

**Helper Scripts Created:**
- `scripts/apply-photo-migration.ts` - Verify migration status
- `scripts/check-enrichment-status.ts` - Check enrichment completion percentage
- `scripts/enrich-location-photos.ts` - The main enrichment script

**Expected Benefits:**
- Eliminates N+1 query problem entirely
- Photos load immediately with location data
- Reduces ongoing Google Places API costs
- Significantly improves perceived performance
- LocationCard component simplified by ~200 lines

**Notes:**
- The `/api/locations/[id]/primary-photo` endpoint is still available but no longer called by LocationCard
- Can be deprecated after verifying everything works
- Enrichment script includes rate limiting (300 requests/minute) to stay under Google API limits
- Helper scripts created:
  - `scripts/apply-photo-migration.ts` - Verify migration status
  - `scripts/run-photo-migration.ts` - Attempted programmatic migration (not needed, manual worked)

**Current State (Jan 22, 2026 - COMPLETE):**
- ✅ All code changes complete
- ✅ Database migration applied and verified
- ✅ Data enrichment complete (2,846/2,916 locations = 97.5%)
- ⏳ User verification pending (test on explore page to confirm no lag)

**What This Achieves:**
- **Eliminates N+1 query problem:** Photos now load with the initial `/api/locations` request
- **Instant photo loading:** No more sequential waterfall of individual photo requests
- **Reduced API costs:** Google Places API only called once during enrichment, not on every page load
- **Better UX:** Users see photos immediately instead of watching them load one-by-one
- **Cleaner code:** LocationCard simplified by ~200 lines (removed all photo fetching logic)

### Explore Page Performance Overhaul (✅ COMPLETE - Jan 22, 2026)

**Problem:** Explore page loaded all 2,916 locations sequentially on initial page load (~30 requests, 8-12 seconds to interactive)

**Solution:** Hybrid data fetching with React Query
- Load first 100 locations + filter metadata immediately (~500ms)
- Fetch remaining locations progressively in background
- Migrate from localStorage to React Query for unified caching

**Performance Results (Verified):**
- ✅ Initial Load: 8-12s → **500ms** (94% faster)
- ✅ Time to Interactive: 8-12s → **500ms** (94% faster)
- ✅ Initial Requests: 30 sequential → **2 parallel** (93% reduction)
- ✅ Initial Payload: 2.5MB → **~100KB** (92% smaller)
- ✅ Filter UI Ready: 8-12s → **500ms** (94% faster)

**Implementation Status:**
1. ✅ Created `/api/locations/filter-options` endpoint (Jan 22, 2026)
   - Pre-computes filter options (cities, categories, regions) server-side
   - Returns aggregated counts (257 cities, 6 categories, 9 regions)
   - 1-hour cache for optimal performance (~10ms response time)

2. ✅ Created filter types (`src/types/filters.ts`)
   - `FilterOption` type for filter metadata
   - `TagOption` type with partial loading indicator
   - `FilterMetadata` server response type

3. ✅ Created React Query hooks (`src/hooks/useLocationsQuery.ts`)
   - `useAllLocationsQuery()` - Infinite query for progressive loading
   - `useFilterMetadataQuery()` - Fetches pre-computed filter options
   - `useAggregatedLocations()` - Flattens all pages into single array
   - Prefetch utilities for data preloading

4. ✅ Migrated ExploreShell to React Query
   - Replaced manual fetch logic with hooks
   - Filter options use server-side metadata (instant load)
   - Added background loading indicator (bottom-right corner)
   - All existing functionality preserved

5. ✅ Implemented background prefetching
   - Auto-fetches next page 500ms after previous loads
   - Throttled to avoid rate limits
   - User sees first 100 locations in ~500ms
   - Remaining ~2,800 locations load progressively

6. ✅ Deprecated localStorage cache functions
   - All functions in `src/lib/locationsCache.ts` marked `@deprecated`
   - Kept for backward compatibility
   - Will be removed in v2.0

**Test Results:**
```
✓ Filter metadata endpoint: 211ms (cached: ~10ms)
✓ First 100 locations: 555ms
✓ Explore page load: 101ms (HTML)
✓ HTTP 200 on all endpoints
✓ All 2,916 locations load progressively in ~10s (non-blocking)
```

**Architecture Change:**
```
Before: Sequential (8-12s blocking)
  Page 1 → Page 2 → ... → Page 30 → Render

After: Hybrid Progressive (500ms to interactive)
  Parallel: Filter metadata + Page 1 → Render
  Background: Page 2 → Page 3 → ... → Page 30 (non-blocking)
```

**Documentation:**
- See `PERFORMANCE_IMPLEMENTATION.md` for detailed implementation guide
- All new code has JSDoc comments and inline documentation

### Prefecture-Based Filtering (✅ COMPLETE - Jan 22, 2026)

**Problem:** City-based filtering had 257 options in dropdown, making it unwieldy and difficult to navigate.

**Solution:** Replace city filter with prefecture-based filtering (47 standard Japanese prefectures).
- Prefecture is the standard administrative division users understand
- City remains searchable via text input
- Better UX with manageable number of filter options

**Implementation Status:**
- ✅ Added `prefecture` field to database column projections
- ✅ Updated type definitions (`Location`, `FilterMetadata`)
- ✅ Modified `/api/locations/filter-options` to aggregate prefectures
- ✅ Updated `/api/locations` to return prefecture in responses
- ✅ Replaced city filter with prefecture filter in ExploreShell
- ✅ Updated FiltersModal UI with prefecture dropdown
- ✅ City remains searchable via search box

**API Changes:**
- `/api/locations/filter-options` now returns `prefectures` array with counts
- `/api/locations` includes `prefecture` field in location objects
- Column projections updated to include `prefecture` in `LOCATION_LISTING_COLUMNS`

**UX Changes:**
- Filters Modal: "City" section replaced with "Prefecture" section
- Search box: Updated placeholder to "Search by name, city, or prefecture..."
- Filter chips: Shows ~47 prefecture options instead of 257 cities
- City filtering: Still available via text search (no dropdown needed)

**Data Coverage:**
- ~99% of locations (2,906/2,916) have prefecture data after enrichment
- Prefecture names normalized (no more "Tokyo Prefecture" vs "Tokyo" variations)
- 18 unique prefectures in filter dropdown
- See "Location Geography Enrichment" section below for details

**Geographic Hierarchy:**
```
Region (9 total: Kanto, Kansai, etc.)
  └─ Prefecture (47 standard prefectures)
      └─ City (257+ cities)
```

**Benefits:**
- More intuitive filtering (prefecture is how people think about Japan)
- Cleaner UI (47 options vs 257 in dropdown)
- No data migration needed (prefecture field already exists)
- Cities still searchable via text input
- Better mobile experience with fewer filter chips

**Files Modified:**
- `src/lib/supabase/projections.ts` - Added prefecture to column projections
- `src/types/filters.ts` - Added prefectures to FilterMetadata
- `src/types/location.ts` - Added prefecture field to Location type
- `src/app/api/locations/filter-options/route.ts` - Prefecture aggregation
- `src/app/api/locations/route.ts` - Prefecture transformation
- `src/components/features/explore/ExploreShell.tsx` - Prefecture filter logic
- `src/components/features/explore/FiltersModal.tsx` - Prefecture UI

### Location Geography Enrichment (✅ COMPLETE - Jan 22, 2026)

**Problem:** Location data had city/prefecture quality issues:
1. 855 locations had `city` set to region name (e.g., "Kanto" instead of "Tokyo")
2. 754 locations had NULL `prefecture` field
3. Prefecture naming was inconsistent ("Tokyo" vs "Tokyo Prefecture")

**Solution:** Google Places API enrichment script to fix city/prefecture data.

**Results:**
| Metric | Before | After |
|--------|--------|-------|
| Kyoto prefecture locations | 5 | **115** |
| Tokyo prefecture locations | 0 | **129** |
| Osaka prefecture locations | 3 | **43** |
| Locations with city = region | 855 | **36** |
| NULL prefecture | 754 | **18** |
| Prefecture naming | Inconsistent | Normalized |

**Remaining Issues (After Cleanup):**
- 28 locations with city = region name (valid destinations like Akihabara, Lake Biwa, Setouchi)
- 10 locations with NULL prefecture (natural features like bays, straits, island chains)

**Script Created:**
- `scripts/enrich-location-geography.ts` - Main enrichment script

**Usage:**
```bash
npx tsx scripts/enrich-location-geography.ts --dry-run  # Preview changes
npx tsx scripts/enrich-location-geography.ts --test     # Process 10 locations
npx tsx scripts/enrich-location-geography.ts            # Full enrichment
npx tsx scripts/enrich-location-geography.ts --normalize-only  # Normalize prefectures
```

**What the script does:**
1. Finds locations where `city IN (Kanto, Kansai, ...)` OR `prefecture IS NULL`
2. Calls Google Places API with `place_id` to get `addressComponents`
3. Extracts city (`locality` or `administrative_area_level_2`) and prefecture (`administrative_area_level_1`)
4. Updates database, normalizing "X Prefecture" → "X"

**Cost:** ~$20-25 for 1,200 API requests (one-time enrichment)

### Data Quality Cleanup (✅ COMPLETE - Jan 22, 2026)

**Problem:** Location data had various quality issues requiring cleanup in multiple phases.

#### Phase 1: Initial Cleanup (8 entries)
Vague/incomplete names or non-destinations deleted:
- Asia Pacific, Gonokawa, National Route 1, Nikko Kaido, Route 58, The East, The Japanese, Things To Do In Okinawa

#### Phase 2: Full Data Quality Cleanup (70 entries)
Comprehensive cleanup run on Jan 22, 2026:

| Phase | Category | Deleted | Description |
|-------|----------|---------|-------------|
| 1 | Services/Experiences | 21 | Tour services, rental services (not physical venues) |
| 2 | Duplicates | 36 | Same place_id duplicates, highway entries |
| 3 | Incomplete Names | 13 | Truncated names like "Museum of", "Port of", etc. |

**Services Deleted (Phase 1):**
Tour/rental services (not physical venues): Free walking tour Kyoto, ASO KUJU CYCLE TOUR (2), Asobo-Ya tours, Segway Guided Tour (2), various canyoning/cycling/hiking tours, Rental kimono dressing, Rental Kimono Goen Style, etc.

**Duplicates Deleted (Phase 2):**
- 6 "Chugoku Expressway" entries (highway, all deleted)
- 30 duplicate locations with same place_id (kept one with best data per group)

**Incomplete Names Deleted (Phase 3):**
"Museum of" (2), "National" (2), "Site of" (2), "Port of", "Tobacco and", "Tomb of", "Hells of", "House of", "Rafting", "J R A"

**Results:**
- Total locations: 2,916 → **2,846** (70 deleted in Phase 2)
- All deletions logged to `scripts/deletion-log-2026-01-22.json` for rollback

**Scripts Created:**
- `scripts/delete-low-quality-locations.ts` - Initial cleanup (8 entries)
- `scripts/cleanup-data-quality.ts` - Comprehensive cleanup (services, duplicates, incomplete)

**Usage:**
```bash
npx tsx scripts/cleanup-data-quality.ts --dry-run     # Preview all changes
npx tsx scripts/cleanup-data-quality.ts --phase=1     # Services only
npx tsx scripts/cleanup-data-quality.ts --phase=2     # Duplicates only
npx tsx scripts/cleanup-data-quality.ts --phase=3     # Incomplete names only
npx tsx scripts/cleanup-data-quality.ts               # Full cleanup
```

**Remaining valid city=region locations (~28):**
- Famous areas: Akihabara, Setouchi, Ogasawara, Izu Islands
- Lakes: Lake Biwa, Lake Suwa, Lake Towada, Lake Shinji
- Natural features: Shimanto River, Naruto Strait, Ago Bay
- Islands/Beaches: Amami-Oshima, Nagannu Island, San Marina Beach

### Geographic Inconsistency Cleanup (✅ COMPLETE - Jan 22, 2026)

**Problem:** Database contains location entries with geographic inconsistencies:
1. **Duplicate place_id with different regions** - Same place appearing multiple times with conflicting geographic data
   - Example: "Manpuku-ji, 宇治市, Shikoku" and "Manpuku-ji, 宇治市, Kanto"
   - Uji City (宇治市) is actually in Kyoto Prefecture (Kansai region)
2. **Prefecture-region mismatches** - Prefectures assigned to wrong regions

**Solution:** Cleanup script using canonical prefecture→region mapping for Japan's 47 prefectures.

**Script Created:**
- `scripts/cleanup-geography-inconsistencies.ts` - Geographic inconsistency cleanup

**Phases:**
| Phase | Description | Action |
|-------|-------------|--------|
| 1 | Duplicate place_id with different regions | Delete duplicates (keep highest quality score) |
| 1B | ALL duplicate place_ids (same region) | Delete true duplicates where names are similar |
| 2 | Prefecture-region mismatches | Update region to match canonical mapping |
| 3 | Google Places API verification | Fix NULL prefecture, city=region issues, verify region |

**Phase 3 Details (API Verification):**
- **3A**: Fix locations with NULL prefecture - fetch from API
- **3B**: Fix locations where city = region name (e.g., "Kanto") - get actual city from API
- **3C**: Verify and fix region based on prefecture from API
- Rate limited: 5 requests/second (200ms delay)
- Default limit: 100 locations per run (configurable with `--limit`)

**Quality Score Algorithm (for Phase 1):**
- Geographic consistency (prefecture matches expected region): +100 points
- Has primary_photo_url: +20 points
- Has prefecture: +15 points
- Has city: +10 points
- Has rating/review_count: +5 points each

**Usage:**
```bash
npx tsx scripts/cleanup-geography-inconsistencies.ts --dry-run                    # Preview all changes
npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=1                    # Duplicates with different regions
npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=1b                   # ALL duplicate place_ids
npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=2                    # Mismatches only
npx tsx scripts/cleanup-geography-inconsistencies.ts --verify-with-api            # Include API verification
npx tsx scripts/cleanup-geography-inconsistencies.ts --verify-with-api --limit=50 # Limit API calls
npx tsx scripts/cleanup-geography-inconsistencies.ts --phase=3 --verify-with-api  # API phase only
npx tsx scripts/cleanup-geography-inconsistencies.ts                              # Full cleanup (phases 1-2)
```

**Logs:** `scripts/geography-cleanup-log-2026-01-22.json`

**Results (Jan 22, 2026):**

*Initial Run:*
| Issue Type | Count | Action |
|------------|-------|--------|
| Duplicate place_id with different regions | 8 | Deleted |
| Prefecture-region mismatches | 86 | Updated region |
| Malformed prefecture names | 2 | Fixed manually |
| **Total changes** | **96** | |

*Malformed Prefecture Fix (Jan 22, 2026):*

Added comprehensive prefecture normalization to handle:
- **Japanese kanji prefectures** (22 entries): `京都府` → `Kyoto`, `北海道` → `Hokkaido`, etc.
- **Comma-separated values** (7 entries): `Kikuchi, Kumamoto` → `Kumamoto`, etc.

| Issue Type | Count | Action |
|------------|-------|--------|
| Japanese kanji prefectures | 22 | Normalized to English |
| Comma-separated prefecture values | 7 | Extracted correct prefecture |
| Additional duplicate place_ids found | 5 | Deleted |
| **Total fixes** | **34** | |

**Script Enhancement:**
- Added `JAPANESE_TO_ENGLISH_PREFECTURE` mapping for all 47 prefectures
- Enhanced `normalizePrefecture()` to handle kanji and comma-separated formats
- Phase 2 now normalizes prefecture field in addition to fixing region

*Phase 1B - True Duplicate Cleanup (Jan 22, 2026):*

Added Phase 1B to find and remove ALL duplicate place_id entries where names are clearly
variants of each other (share common words). This is more comprehensive than Phase 1 which
only catches duplicates with different regions.

**Smart similarity detection:**
- Checks for common words between names
- Handles combined words (e.g., "Amanoiwato" matches "Amano Iwato")
- Uses connected component analysis for groups >2 entries
- Skips suspicious groups where names are too different (likely data errors)

| Category | Count |
|----------|-------|
| Duplicate groups found | 260 |
| True duplicates (similar names) | 217 |
| Skipped (names too different) | 43 |
| Entries deleted | 247 |

**Examples cleaned:**
- "Aizu Bukeyashiki" + "Aizu Samurai" → kept "Aizu Bukeyashiki"
- "Adachi Museum" + "Adachi Museum of Art" → kept "Adachi Museum of Art"
- "Amano Iwato" + "Amano Iwato-jinja" + "Amanoiwato Shrine Nishi Hongu" → kept "Amanoiwato Shrine Nishi Hongu"

**Remaining 43 skipped groups** have same place_id but very different names (e.g., "Setsubun" vs "Kasuga Taisha") - these are likely data import errors where different entities received the same place_id.

**Final location count:** 2,916 → 2,846 → 2,838 → 2,833 → **2,586**

### Priority 3: Medium

- [x] **Photo loading optimization** - ✅ Complete (Jan 22, 2026)
- [x] **Explore page performance overhaul** - ✅ Complete (Jan 22, 2026)
- [x] **Prefecture-based filtering** - ✅ Complete (Jan 22, 2026)
- [x] **Location geography enrichment** - ✅ Complete (Jan 22, 2026)
- [x] **Data quality cleanup** - ✅ Complete (Jan 22, 2026) - Deleted 78 entries total (8 initial + 70 full cleanup)
- [x] **Geographic inconsistency cleanup** - ✅ Complete (Jan 22, 2026) - Fixed 377 entries (260 duplicates deleted, 86 region fixes, 29 prefecture normalizations, 2 manual fixes)
- [ ] Add trip sharing feature (PENDING)

### Not Planned

- **Weather integration**: Real-time weather forecasts only useful for trips within 5-7 days. Historical/seasonal weather data would be more valuable for advance planning but requires different approach. Backend weather scoring during itinerary generation uses mock data and works fine.

### Priority 4: Low (PENDING)

- [ ] Mobile app/PWA
- [ ] Real-time collaboration
- [ ] User review system

## Key Files Modified in Performance Refactoring

| File | Changes |
|------|---------|
| `src/components/features/explore/LocationCard.tsx` | Added React.memo() |
| `src/components/features/itinerary/SortableActivity.tsx` | Added React.memo() |
| `src/components/features/itinerary/PlaceActivityRow.tsx` | Added React.memo(), lazy modal import |
| `src/components/features/itinerary/ActivityRow.tsx` | Added React.memo() |
| `src/context/TripBuilderContext.tsx` | Added useMemo for context value |
| `src/lib/supabase/projections.ts` | **NEW** - Column projections & types |
| `src/lib/itineraryGenerator.ts` | Column projections, city filtering |
| `src/lib/server/itineraryEngine.ts` | Column projections, city filtering |
| `src/app/api/itinerary/refine/route.ts` | Column projections, city filtering |
| `src/app/api/locations/route.ts` | Column projections |
| `src/app/api/locations/[id]/route.ts` | Column projections |
| `src/app/api/locations/[id]/primary-photo/route.ts` | Column projections |
| `src/components/features/explore/ExploreShell.tsx` | Lazy FiltersModal import, React Query migration |
| `src/components/features/explore/LocationGrid.tsx` | Lazy LocationDetailsModal import |
| `src/components/features/community/CommunityShell.tsx` | Lazy CreateDiscussionModal |
| `src/components/features/community/TopicDetailClient.tsx` | Lazy EditReplyModal, HistoryModal |
| `src/components/features/explore/FeaturedLocationsHero.tsx` | next/image optimization |
| `src/providers/QueryProvider.tsx` | **NEW** - React Query provider |
| `src/hooks/useLocationDetailsQuery.ts` | **NEW** - React Query hook |
| `src/components/LayoutWrapper.tsx` | Added QueryProvider |
| `src/app/api/itinerary/availability/route.ts` | Added rate limiting |
| `supabase/migrations/20260122_add_lookup_indexes.sql` | **NEW** - Lookup indexes |
| `supabase/migrations/20260122_add_primary_photo_url.sql` | **NEW** - Add primary_photo_url column |
| `scripts/enrich-location-photos.ts` | **NEW** - Script to fetch and store primary photos |
| `src/lib/supabase/projections.ts` | Updated LOCATION_LISTING_COLUMNS to include primary_photo_url |
| `src/components/features/explore/LocationCard.tsx` | Removed usePrimaryPhoto hook, use location.primaryPhotoUrl |
| `src/types/location.ts` | Added primaryPhotoUrl field |
| `src/app/api/locations/filter-options/route.ts` | **NEW** - Filter metadata endpoint, added prefecture aggregation |
| `src/types/filters.ts` | **NEW** - Filter types (FilterOption, TagOption, FilterMetadata), added prefectures |
| `src/hooks/useLocationsQuery.ts` | **NEW** - React Query hooks for locations |
| `src/lib/locationsCache.ts` | Deprecated localStorage functions |
| `src/types/location.ts` | Added prefecture field |
| `src/components/features/explore/ExploreShell.tsx` | Prefecture-based filtering logic |
| `src/components/features/explore/FiltersModal.tsx` | Prefecture UI (replaced city dropdown) |
| `scripts/enrich-location-geography.ts` | **NEW** - Script to fix city/prefecture data via Google Places API |
| `scripts/delete-low-quality-locations.ts` | **NEW** - Script to delete low-quality location entries |
| `scripts/cleanup-data-quality.ts` | **NEW** - Comprehensive data cleanup (services, duplicates, incomplete names) |
| `scripts/cleanup-geography-inconsistencies.ts` | **NEW** - Geographic inconsistency cleanup (duplicate place_ids, prefecture-region mismatches, Japanese/comma-separated prefecture normalization) |
| `PERFORMANCE_IMPLEMENTATION.md` | **NEW** - Performance overhaul documentation |

## New Architecture Components

### Column Projections (`src/lib/supabase/projections.ts`)
- `LOCATION_LISTING_COLUMNS` - 13 columns for grids/lists (includes prefecture)
- `LOCATION_DETAIL_COLUMNS` - 17 columns for detail views
- `LOCATION_ITINERARY_COLUMNS` - 17 columns for itinerary generation
- `LOCATION_PHOTO_COLUMNS` - 8 columns for photo endpoint
- `LocationDbRow` type for type-safe transformations

### React Query Setup
- `QueryProvider` wraps app in `LayoutWrapper`
- `useLocationDetailsQuery` hook for location details caching
- `useLocationsQuery` hooks for explore page progressive loading:
  - `useAllLocationsQuery()` - Infinite query for paginated locations
  - `useFilterMetadataQuery()` - Pre-computed filter options
  - `useAggregatedLocations()` - Flattened locations array
- Legacy `locationDetailsStore` and `locationsCache` maintained for backwards compatibility
- DevTools available in development mode

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all tests
npm test -- tests/services/trip/  # Run specific tests
```

## Known Issues / Pre-existing

- TripBuilderContext tests have localStorage mocking issues (pre-existing)
- itineraryGenerator tests need Supabase env vars (pre-existing)
- Some lint warnings in unrelated files (googlePlaces.ts, routing/cache.ts)

## Next Steps

1. ✅ ~~Photo loading optimization~~ (COMPLETE - Jan 22, 2026)
   - Migration applied, photos stored directly in database
2. ✅ ~~Data quality cleanup~~ (COMPLETE - Jan 22, 2026)
   - Phase 1: Deleted 8 low-quality entries
   - Phase 2: Deleted 70 entries (services, duplicates, incomplete names)
3. ✅ ~~Geographic inconsistency cleanup~~ (COMPLETE - Jan 22, 2026)
   - Deleted 13 duplicate place_id entries (8 initial + 5 additional)
   - Fixed 86 prefecture-region mismatches
   - Normalized 29 malformed prefecture names (Japanese kanji + comma-separated)
   - **Final total: 2,833 locations**
4. **Priority 3**: Trip sharing feature
5. **Testing**: Add more integration tests for API routes
6. **Consider**: Further React Query migration for other data fetching

## Database

- Uses Supabase PostgreSQL
- Key tables: `locations`, `favorites`, `guide_bookmarks`, `place_details`
- Migrations:
  - `20260121_add_performance_indexes.sql` - Full-text search, geographic indexes
  - `20260122_add_lookup_indexes.sql` - Lookup indexes for user queries
  - `20260122_add_primary_photo_url.sql` - Add primary_photo_url column for photo optimization
