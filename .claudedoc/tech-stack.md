# Tech Stack & Project Structure

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| State Management | React Context (AppState, TripBuilderContext), React Query |
| Maps | Mapbox GL |
| Testing | Vitest |
| Caching | React Query (@tanstack/react-query) |
| Forms | React Hook Form + Zod (validation) |
| Drag & Drop | @dnd-kit |
| Rate Limiting | @upstash/ratelimit + @upstash/redis |
| HTTP Client | Axios |
| Web Scraping | Cheerio |
| Secret Scanning | Gitleaks (pre-commit hook) |

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
├── data/                  # Static data (interests, entry points, categoryHierarchy)
├── hooks/                 # Custom React hooks
│   ├── index.ts                    # Central exports for all hooks
│   ├── useLocationDetailsQuery.ts  # React Query hook for location details
│   ├── useLocationsQuery.ts        # React Query hooks for explore page
│   ├── useFavoritesQuery.ts        # React Query hook for favorites
│   └── useBookmarksQuery.ts        # React Query hook for bookmarks
├── lib/                   # Utilities and services
│   ├── api/               # API utilities (middleware, rate limiting, pagination)
│   ├── supabase/          # Supabase client + column projections
│   ├── routing/           # Route calculation utilities
│   ├── locations/         # Location service (server-side fetching)
│   ├── scoring/           # Location scoring, diversity rules, time optimization
│   ├── server/            # Server-side operations (itinerary engine)
│   ├── tripBuilder/       # Trip builder utilities (region aggregation, city relevance)
│   ├── mapbox/            # Mapbox service for maps and routing
│   └── ...                # Additional: auth, cache, cost, weather, tips, utils
├── providers/             # React providers
│   └── QueryProvider.tsx  # React Query provider
├── services/              # Domain services
│   ├── sync/              # Supabase sync operations
│   └── trip/              # Trip CRUD and edit history
├── state/                 # Global state (AppState)
└── types/                 # TypeScript type definitions
```

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all tests
npm test -- tests/services/trip/  # Run specific tests
gitleaks git --no-banner          # Scan repo for secrets
```

## Database

### Overview
- Uses Supabase PostgreSQL
- Key tables: `locations`, `favorites`, `guide_bookmarks`, `place_details`

### Migrations

| Migration | Description |
|-----------|-------------|
| `20260121_add_performance_indexes.sql` | Full-text search, geographic indexes |
| `20260122_add_lookup_indexes.sql` | Lookup indexes for user queries |
| `20260122_add_primary_photo_url.sql` | Add primary_photo_url column for photo optimization |
| `20260122_add_google_places_enrichment.sql` | Google Places enrichment columns (8 columns) |

### Google Places Enrichment Columns

| Column | Type | Description |
|--------|------|-------------|
| `google_primary_type` | text | Primary type (e.g., `buddhist_temple`, `castle`) |
| `google_types` | text[] | Array of all types |
| `business_status` | text | `OPERATIONAL`, `CLOSED_TEMPORARILY`, `CLOSED_PERMANENTLY` |
| `price_level` | smallint | 1-4 ($ to $$$$) |
| `accessibility_options` | jsonb | Wheelchair access data |
| `dietary_options` | jsonb | Vegetarian food info |
| `service_options` | jsonb | Dine-in, takeout, delivery |
| `meal_options` | jsonb | Breakfast, brunch, lunch, dinner |

## Scripts

Utility scripts in `scripts/` directory:

| Script | Purpose |
|--------|---------|
| `enrich-location-photos.ts` | Fetch and store primary photos from Google Places |
| `enrich-location-geography.ts` | Fix city/prefecture data via Google Places API |
| `enrich-google-places-full.ts` | Comprehensive Google Places data enrichment |
| `cleanup-data-quality.ts` | Data cleanup (services, duplicates, incomplete names) |
| `cleanup-geography-inconsistencies.ts` | Geographic inconsistency cleanup |
| `consolidate-city-wards.ts` | Consolidate wards into parent cities (e.g., "Sakyo Ward" → "Kyoto") |
| `audit-category-mismatches.ts` | Audit category mismatches |
| `fix-category-mismatches.ts` | Fix category corrections |
