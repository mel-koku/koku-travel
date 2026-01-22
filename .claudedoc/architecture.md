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
