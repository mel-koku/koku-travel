# Development Rules & Known Issues

## Development Rules

### Code Patterns

1. **Use column projections** - Never use `.select("*")`. Import from `src/lib/supabase/projections.ts`.

2. **Server/client boundary** - Server-side code imports from `locationService.ts`. Client-side uses API endpoints via React Query hooks.

3. **React Query for state** - Use React Query hooks for server state. Deprecated stores marked with `@deprecated`.

4. **React.memo() for performance** - Applied to: `LocationCard`, `SortableActivity`, `PlaceActivityRow`, `ActivityRow`.

5. **Lazy loading modals** - Use dynamic imports for modals: `LocationDetailsModal`, `FiltersModal`, etc.

6. **Lazy env access in services** - Singleton services should read environment variables lazily (in methods), not in constructors. This avoids module initialization order issues where `envConfig` may not be populated yet.

```typescript
// WRONG - may cache undefined
constructor() {
  this.token = env.mapboxAccessToken;
}

// CORRECT - reads lazily
getToken() {
  return env.mapboxAccessToken;
}
```

### Testing

- Run tests: `npm test`
- Run specific tests: `npm test -- tests/services/trip/`
- **479 total tests** across 36 test files
- Shared test utilities in `tests/utils/` (component factory, API helpers, context helpers)
- Test fixtures in `tests/fixtures/locations.ts`

### Test Fixtures

```typescript
// tests/fixtures/locations.ts
createTestLocation()     // Factory with optional overrides
TEST_LOCATIONS           // Pre-built test locations
locationToDbRow()        // Convert Location to database row
```

## Known Issues

### Resolved Test Failures

Previous test failures have been fixed:
- ✅ TripBuilderContext tests - Fixed with shared localStorage mocking utilities
- ✅ itineraryGenerator tests - Fixed with optional locations parameter to bypass Supabase

All 479 tests now pass.

## Performance Guidelines

### Explore Page

- First 100 locations + filter metadata load in ~500ms
- Remaining locations load progressively in background
- Filter options pre-computed server-side

### Photo Loading

- Photos stored in `primary_photo_url` column
- No more N+1 queries for photos
- 97.5% of locations have photos (rest use fallback)

### Database Queries

- Always use column projections
- City-based filtering reduces memory in pagination
- Indexes on: favorites, bookmarks, place_details, geographic columns
