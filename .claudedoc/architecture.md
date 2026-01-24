# Architecture Patterns

## Column Projections

Located in `src/lib/supabase/projections.ts`.

### Projection Types

| Projection | Columns | Use Case |
|------------|---------|----------|
| `LOCATION_LISTING_COLUMNS` | 21 | Grids/lists (includes prefecture + enrichment) |
| `LOCATION_DETAIL_COLUMNS` | 18 | Detail views (includes description for overview fallback) |
| `LOCATION_ITINERARY_COLUMNS` | 21 | Itinerary generation (includes enrichment for meal planning) |
| `LOCATION_PHOTO_COLUMNS` | 8 | Photo endpoint |

### LocationDbRow Type

Type-safe database row transformation. Includes all enrichment fields:
- `google_primary_type`, `google_types`
- `business_status`, `price_level`
- `accessibility_options`, `dietary_options`
- `service_options`, `meal_options`

## React Query Setup

### Provider

`QueryProvider` wraps app in `src/components/LayoutWrapper.tsx`.

### Location Hooks (`src/hooks/useLocationsQuery.ts`)

```typescript
useAllLocationsQuery()     // Infinite query for paginated locations
useFilterMetadataQuery()   // Pre-computed filter options
useAggregatedLocations()   // Flattened locations array
```

### Favorites/Bookmarks Hooks

```typescript
// src/hooks/useFavoritesQuery.ts
useFavoritesQuery(userId)        // Fetch user favorites
useToggleFavoriteMutation()      // Toggle with optimistic updates
useFavorites(userId)             // Combined query + mutation

// src/hooks/useBookmarksQuery.ts
useBookmarksQuery(userId)        // Fetch user bookmarks
useToggleBookmarkMutation()      // Toggle with optimistic updates
useBookmarks(userId)             // Combined query + mutation
```

### Query Key Factories

```typescript
export const favoriteKeys = {
  all: ["favorites"],
  user: (userId) => ["favorites", "user", userId]
};

export const bookmarkKeys = {
  all: ["bookmarks"],
  user: (userId) => ["bookmarks", "user", userId]
};
```

### Configuration
- 5-minute stale time
- 30-minute garbage collection
- DevTools available in development

## Location Service

Server-side location fetching in `src/lib/locations/locationService.ts`.

### Server/Client Boundary

- **Server-side**: Import directly from `locationService.ts`
- **Client-side**: Use API endpoints via React Query hooks

Enforced by Next.js (`supabase/server.ts` uses `next/headers`).

### Related Hooks

| Hook | Purpose |
|------|---------|
| `useWishlistLocations` | Wishlist locations |
| `useActivityLocations` | Activity locations |
| `usePlanItinerary` | Itinerary scheduling |
| `useReplacementCandidates` | Replacement candidates |

### Related API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/locations/batch` | Batch fetch by IDs (max 100) |
| `/api/itinerary/schedule` | Schedule itinerary with travel times |
| `/api/itinerary/replacements` | Find replacement candidates |

## Category Hierarchy

Located in `src/data/categoryHierarchy.ts`.

### Structure

```typescript
export const CATEGORY_HIERARCHY: CategoryHierarchy[] = [
  {
    id: "culture",
    label: "Culture",
    icon: "culture",
    subTypes: [
      { id: "shrine", label: "Shrine", patterns: [...], googleTypes: [...] },
      { id: "temple", label: "Temple", patterns: [...], googleTypes: [...] },
      // ...
    ],
  },
  // ...
];
```

### Categories

| Category | Sub-types |
|----------|-----------|
| Culture | shrine, temple, museum, landmark, performing_arts |
| Food | restaurant, cafe, bar, market |
| Nature | park, garden, beach, mountain, onsen |
| Shopping | mall, street, specialty |
| View | viewpoint, tower |

### Helper Functions

```typescript
getSubTypesForCategories(categoryIds: string[]): SubType[]
locationMatchesSubTypes(location: Location, subTypeIds: string[]): boolean
getCategoryById(categoryId: string): CategoryHierarchy | undefined
getSubTypeById(subTypeId: string): SubType | undefined
```

### Sub-type Matching Logic

1. First checks `location.googlePrimaryType` against sub-type's `googleTypes` array
2. Falls back to name pattern matching using sub-type's `patterns` array
3. Enables accurate filtering even for locations without Google Places data

## Trip Builder

2-step trip builder with live preview at `/trip-builder`.

### Components (`src/components/features/trip-builder/`)

| Component | Description |
|-----------|-------------|
| `TripBuilderV2.tsx` | Main orchestrator with responsive split-screen layout |
| `PlanStep.tsx` | Step 1: Essentials + interests + city selection |
| `ReviewStep.tsx` | Step 2: Review selections + customize preferences |
| `LivePreview.tsx` | Right panel/bottom sheet with progressive itinerary preview |
| `CityList.tsx` | Searchable list view with region grouping and relevance filtering |
| `InterestChips.tsx` | Selectable interest chips (max 5) |
| `MobileBottomSheet.tsx` | Swipeable bottom sheet for mobile preview |

### City Selection (CityList)

The CityList handles 837 cities with:
- **Search**: Filter cities/regions by name
- **Filter modes**: All / High Match (75%+) / Selected
- **Region grouping**: Expandable region sections (Hokkaido, Tohoku, Kanto, etc.)
- **Relevance highlighting**: Cities matching selected interests are highlighted

**Region Data (`src/data/regionData.ts`)**
```typescript
type RegionData = {
  id: RegionId;           // 'hokkaido', 'kansai', etc.
  name: string;           // 'Hokkaido', 'Kansai'
  nameJa: string;         // '北海道', '関西'
  center: { lat, lng };   // Region center coordinates
  bounds: { north, south, east, west };  // Bounding box
};
```

### City Relevance Utilities (`src/lib/tripBuilder/cityRelevance.ts`)

```typescript
calculateCityRelevance(city, interests)  // % of interests matched in a city
getCitiesByRelevance(interests)          // All cities sorted by relevance
getRelevantCities(interests, minRelevance) // Filter by minimum relevance
getAllCities()                           // All cities with metadata
getCityMetadata(city)                    // Single city lookup
```

### Pre-computed Data (`src/data/cityInterests.json`)

Generated by `scripts/generate-city-interests.ts`:
- **837 cities** with interest counts
- **8 interests**: culture, food, nature, shopping, photography, nightlife, wellness, history
- Coordinates and region metadata for each city

### New Preferences (Step 2)

| Preference | Options |
|------------|---------|
| Group composition | Solo, couple, family, friends, business + children ages |
| Accommodation style | Ryokan, budget, mid-range, luxury |
| Transportation | Walking tolerance, prefer trains/buses, rental car |

### Responsive Layout

- **Desktop**: Split-screen (inputs left, preview right)
- **Mobile**: Stacked layout with bottom sheet preview (swipe up to see)

## Scoring System

Located in `src/lib/scoring/`. Powers intelligent itinerary generation.

### Modules

| Module | Purpose |
|--------|---------|
| `locationScoring.ts` | Score locations based on user preferences and interests |
| `diversityRules.ts` | Ensure variety in itinerary (category, geography) |
| `timeOptimization.ts` | Optimize visit order for travel time efficiency |

### Usage

The scoring system is used by the itinerary engine to:
1. Rank candidate locations by relevance to user interests
2. Apply diversity rules to avoid repetitive itineraries
3. Optimize time slots based on location characteristics (opening hours, visit duration)

## Server-Side Operations

Located in `src/lib/server/`. Server-only utilities for heavy computation.

### Modules

| Module | Purpose |
|--------|---------|
| `itineraryEngine.ts` | Core itinerary generation logic |

These modules run exclusively on the server to leverage database access and avoid exposing business logic to the client.

### City Filtering

The itinerary generator filters locations by selected cities. City names in the database are normalized:
- Ward names consolidated to parent cities (e.g., "Sakyo Ward" → "Kyoto", "Minato City" → "Tokyo")
- Japanese suffixes removed (e.g., "Fukuoka-shi" → "Fukuoka")
- Ambiguous wards disambiguated using Google Places `prefecture` data

This enables accurate filtering when users select cities in the trip builder.

## Mapbox Integration

### Service (`src/lib/mapbox/mapService.ts`)

The `MapboxService` provides access to Mapbox for map rendering and routing.

**Important:** The service reads the access token lazily (on each call) rather than caching it in the constructor. This avoids module initialization order issues where the token might not be available when the module first loads.

```typescript
// Correct - lazy read
getAccessToken(): string | undefined {
  return env.mapboxAccessToken || env.routingMapboxAccessToken;
}

// Wrong - caches undefined if env not ready
constructor() {
  this.accessToken = env.mapboxAccessToken; // May be undefined!
}
```

### Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Client-side map rendering | Public (embedded in JS) |
| `ROUTING_MAPBOX_ACCESS_TOKEN` | Server-side routing | Server only |
| `ENABLE_MAPBOX` | Feature flag | Both |

**Note:** `NEXT_PUBLIC_*` variables are embedded at build time. After adding/changing them in Vercel, you must redeploy (without build cache) for changes to take effect.

## Routing System

### Provider Chain (`src/lib/routing/provider.ts`)

The routing system uses a fallback chain to ensure travel times are always available:

1. **Cache check** - Returns cached route if available
2. **Cheap mode** - If `CHEAP_MODE=true`, uses heuristic directly (no API calls)
3. **Provider resolution** - Finds first enabled provider (Mapbox → Google)
4. **Heuristic fallback** - If no provider or API error, falls back to heuristic

```typescript
// Fallback chain in requestRoute()
1. getCachedRoute(request)  // Check cache first
2. if (env.isCheapMode) → estimateHeuristicRoute()
3. resolveProvider() → mapbox | google | null
4. if (!provider) → estimateHeuristicRoute()
5. try { provider.handler() } catch { estimateHeuristicRoute() }
```

### Heuristic Estimates

When real routing APIs aren't available, the system uses Haversine distance with average speeds:

| Mode | Speed (km/h) |
|------|--------------|
| walk | 4.5 |
| bicycle | 15 |
| car/taxi | 35 |
| train | 45 |
| subway | 32 |
| transit | 28 |

Heuristic results are marked with `provider: "mock"` and `isEstimated: true` in the API response.

### Route Optimization (`src/lib/routeOptimizer.ts`)

Nearest-neighbor algorithm for optimizing activity order:

```typescript
type OptimizeRouteResult = {
  order: string[];        // Activity IDs in optimized order
  optimizedCount: number; // Activities with coordinates
  skippedCount: number;   // Activities missing coordinates
  orderChanged: boolean;  // Whether order actually changed
};
```

### Travel Segment Display

Travel segments include an `isEstimated` flag to distinguish real vs. heuristic times:

```typescript
type ItineraryTravelSegment = {
  mode: ItineraryTravelMode;
  durationMinutes: number;
  isEstimated?: boolean;  // True if heuristic estimate
  // ...
};
```

The UI shows:
- Loading spinner when `durationMinutes === 0` (calculating)
- "~est" badge when `isEstimated === true`

## Location Details Modal

Located in `src/components/features/explore/LocationDetailsModal/`.

### Components

| Component | Purpose |
|-----------|---------|
| `LocationDetailsModal.tsx` | Main modal wrapper |
| `PhotoCarousel.tsx` | Photo carousel with thumbnails and navigation |
| `LocationDetailsSections.tsx` | Overview, address, hours, reviews |
| `useLocationDetails.ts` | React Query hook for fetching details |

### Photo Carousel

The `PhotoCarousel` component displays all location photos at the top of the modal:
- Main image with left/right navigation arrows
- Photo counter (e.g., "3 / 8")
- Thumbnail strip for quick navigation
- Falls back to `location.image` if no Google Photos available

### Overview Fallback Chain

The API (`/api/locations/[id]`) provides a fallback chain for `editorialSummary`:
1. Google Places `editorialSummary` (if available)
2. Database `short_description` (Claude-generated editorial content)
3. Database `description` (basic label)

This ensures 100% of locations display an overview when their modal is opened.
