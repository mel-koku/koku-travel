# Architecture Patterns

## Column Projections

Located in `src/lib/supabase/projections.ts`.

### Projection Types

| Projection | Columns | Use Case |
|------------|---------|----------|
| `LOCATION_LISTING_COLUMNS` | 21 | Grids/lists (includes prefecture + enrichment) |
| `LOCATION_DETAIL_COLUMNS` | 17 | Detail views |
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
| `CityMap.tsx` | Interactive Mapbox map with region-based clustering |
| `CityList.tsx` | Searchable list view with region grouping |
| `InterestChips.tsx` | Selectable interest chips (max 5) |
| `MobileBottomSheet.tsx` | Swipeable bottom sheet for mobile preview |

### Region-Based Map Clustering

The CityMap uses a two-level drill-down UX to handle 837 cities:

**Region View (Initial)**
- Shows 9 region markers (Hokkaido, Tohoku, Kanto, Chubu, Kansai, Chugoku, Shikoku, Kyushu, Okinawa)
- Region markers show city count and are color-coded by selection/relevance state
- Click a region to expand and see its cities

**City View (Expanded)**
- Shows individual city markers for the selected region
- Back button returns to region view
- Auto-switches to region view when zooming out past threshold (6.5)

**Region Data (`src/data/regionData.ts`)**
```typescript
type RegionData = {
  id: RegionId;           // 'hokkaido', 'kansai', etc.
  name: string;           // 'Hokkaido', 'Kansai'
  nameJa: string;         // '北海道', '関西'
  center: { lat, lng };   // Region center coordinates
  bounds: { north, south, east, west };  // Bounding box
  zoomLevel: number;      // Recommended zoom for this region
};
```

**Region Aggregation (`src/lib/tripBuilder/regionAggregation.ts`)**
```typescript
aggregateCitiesByRegion(interests, selectedCities)  // Group cities by region
getCitiesForRegion(regionId, interests, selectedCities)  // Get cities for a region
getRegionBoundsArray(regionId)  // Mapbox-compatible bounds
getRegionCenter(regionId)       // Region center as [lng, lat]
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
