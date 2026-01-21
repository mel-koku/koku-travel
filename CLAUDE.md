# Koku Travel - Project Context for Claude

## Overview

Koku Travel is a Japan travel planning application built with Next.js 15 (App Router), TypeScript, Supabase, and Tailwind CSS. It helps users plan itineraries with features like location exploration, trip building, and itinerary generation.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **State Management**: React Context (AppState, TripBuilderContext)
- **Maps**: Mapbox GL
- **Testing**: Vitest

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
├── lib/                   # Utilities and services
│   ├── api/               # API utilities (middleware, rate limiting, pagination)
│   ├── supabase/          # Supabase client configuration
│   └── routing/           # Route calculation utilities
├── services/              # Domain services (NEW - extracted from AppState)
│   ├── sync/              # Supabase sync operations
│   └── trip/              # Trip CRUD and edit history
├── state/                 # Global state (AppState)
└── types/                 # TypeScript type definitions
```

## Improvement Plan Progress

Based on the comprehensive codebase analysis, here's the current status:

### Priority 1: Critical (COMPLETED)

- [x] **Security vulnerabilities fixed**
  - IP address validation in `src/lib/api/middleware.ts`
  - CORS configuration helpers added
  - Body size limits added
  - Search param length validation

- [x] **Code quality fixes**
  - Removed duplicate `sanitizeContext()` in `src/lib/logger.ts`
  - Extracted magic numbers to constants in `src/lib/api/rateLimit.ts`
  - Fixed `any` type casts in `src/components/features/itinerary/ItineraryMap.tsx`

- [x] **API standardization**
  - Added `createApiResponse()` helper in `src/lib/api/pagination.ts`
  - Updated `/api/cities` and `/api/places/details` to use standard envelope

- [x] **Database indexes**
  - Created migration: `supabase/migrations/20260121_add_performance_indexes.sql`
  - Full-text search (tsvector + trigram)
  - Geographic indexes (lat/lng columns)
  - Composite indexes for explore filters and cities

### Priority 2: High (PARTIALLY COMPLETED)

- [x] **Refactored AppState.tsx**
  - Split from 1040 lines to 695 lines
  - Created `src/services/sync/` for Supabase sync operations
  - Created `src/services/trip/` for trip CRUD, activities, edit history
  - All logic now in testable pure functions

- [x] **Added tests for extracted services**
  - `tests/services/trip/tripOperations.test.ts` (21 tests)
  - `tests/services/trip/activityOperations.test.ts` (14 tests)
  - `tests/services/trip/editHistory.test.ts` (16 tests)

- [ ] **Consolidate caching** - Adopt React Query or SWR (pending)

### Priority 3: Medium (PENDING)

- [ ] Complete weather integration (TODO exists in ItineraryShell.tsx)
- [ ] Add trip sharing feature

### Priority 4: Low (PENDING)

- [ ] Mobile app/PWA
- [ ] Real-time collaboration
- [ ] User review system

## Key Files Modified Recently

| File | Changes |
|------|---------|
| `src/lib/api/middleware.ts` | Added IP validation, CORS, body size limits |
| `src/lib/api/rateLimit.ts` | Extracted constants, uses middleware IP function |
| `src/lib/api/pagination.ts` | Added `createApiResponse()` for standard envelope |
| `src/lib/logger.ts` | Removed duplicate `sanitizeContext()` |
| `src/state/AppState.tsx` | Refactored to use service modules (695 lines) |
| `src/services/sync/*` | NEW - Supabase sync operations |
| `src/services/trip/*` | NEW - Trip operations, activities, edit history |

## Service Architecture

### Sync Services (`src/services/sync/`)
- `favoriteSync.ts` - Sync favorites with Supabase
- `bookmarkSync.ts` - Sync guide bookmarks with Supabase
- `types.ts` - Shared sync types

### Trip Services (`src/services/trip/`)
- `tripOperations.ts` - CRUD operations (pure functions)
- `activityOperations.ts` - Activity mutations within itineraries
- `editHistory.ts` - Undo/redo functionality
- `types.ts` - StoredTrip, CreateTripInput, EditHistoryState

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
- Some lint warnings in unrelated files (googlePlaces.ts, routing/cache.ts)

## Next Steps

1. **Priority 2 remaining**: Consolidate caching with React Query or SWR
2. **Priority 3**: Weather integration, trip sharing
3. **Testing**: Add more integration tests for API routes

## Database

- Uses Supabase PostgreSQL
- Key tables: `locations`, `favorites`, `guide_bookmarks`
- Recent migration added performance indexes for search and geographic queries
