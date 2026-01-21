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

### Priority 3: Medium (PENDING)

- [ ] Add trip sharing feature

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
| `src/components/features/explore/ExploreShell.tsx` | Lazy FiltersModal import |
| `src/components/features/explore/LocationGrid.tsx` | Lazy LocationDetailsModal import |
| `src/components/features/community/CommunityShell.tsx` | Lazy CreateDiscussionModal |
| `src/components/features/community/TopicDetailClient.tsx` | Lazy EditReplyModal, HistoryModal |
| `src/components/features/explore/FeaturedLocationsHero.tsx` | next/image optimization |
| `src/providers/QueryProvider.tsx` | **NEW** - React Query provider |
| `src/hooks/useLocationDetailsQuery.ts` | **NEW** - React Query hook |
| `src/components/LayoutWrapper.tsx` | Added QueryProvider |
| `src/app/api/itinerary/availability/route.ts` | Added rate limiting |
| `supabase/migrations/20260122_add_lookup_indexes.sql` | **NEW** - Lookup indexes |

## New Architecture Components

### Column Projections (`src/lib/supabase/projections.ts`)
- `LOCATION_LISTING_COLUMNS` - 11 columns for grids/lists
- `LOCATION_DETAIL_COLUMNS` - 17 columns for detail views
- `LOCATION_ITINERARY_COLUMNS` - 17 columns for itinerary generation
- `LOCATION_PHOTO_COLUMNS` - 8 columns for photo endpoint
- `LocationDbRow` type for type-safe transformations

### React Query Setup
- `QueryProvider` wraps app in `LayoutWrapper`
- `useLocationDetailsQuery` hook replaces manual caching
- Legacy `locationDetailsStore` maintained for backwards compatibility
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

1. **Priority 3**: Trip sharing feature
2. **Testing**: Add more integration tests for API routes
3. **Consider**: Further React Query migration for other data fetching

## Database

- Uses Supabase PostgreSQL
- Key tables: `locations`, `favorites`, `guide_bookmarks`, `place_details`
- Migrations:
  - `20260121_add_performance_indexes.sql` - Full-text search, geographic indexes
  - `20260122_add_lookup_indexes.sql` - Lookup indexes for user queries
