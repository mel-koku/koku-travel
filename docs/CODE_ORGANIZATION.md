# Code Organization Guidelines

This document outlines code organization standards and conventions for the Koku Travel codebase.

## Constants

### Storage Keys

All localStorage keys are centralized in `src/lib/constants/storage.ts`:

- `APP_STATE_STORAGE_KEY` - Main app state (user, favorites, trips)
- `TRIP_BUILDER_STORAGE_KEY` - Trip builder form data
- `WISHLIST_STORAGE_KEY` - Legacy wishlist (for migration)

**Usage:**
```typescript
import { APP_STATE_STORAGE_KEY } from "@/lib/constants";
localStorage.setItem(APP_STATE_STORAGE_KEY, data);
```

### App State Constants

App state management constants are in `src/lib/constants/appState.ts`:

- `APP_STATE_DEBOUNCE_MS` - Debounce delay for localStorage writes (500ms)
- `MAX_EDIT_HISTORY_ENTRIES` - Maximum edit history entries per trip (50)
- `STABLE_DEFAULT_USER_ID` - Default user ID for SSR hydration

**Usage:**
```typescript
import { APP_STATE_DEBOUNCE_MS, MAX_EDIT_HISTORY_ENTRIES } from "@/lib/constants";
setTimeout(() => { /* ... */ }, APP_STATE_DEBOUNCE_MS);
```

## Type Definitions

### Type Organization

Types are organized by domain in `src/types/`:

- `trip.ts` - Trip builder and trip-related types
- `itinerary.ts` - Itinerary structure and editing types
- `location.ts` - Location and place types
- `traveler.ts` - Traveler profile types
- `tripDomain.ts` - Domain model types (Trip, TripDay, TripActivity)
- `availability.ts` - Availability status types
- `weather.ts` - Weather-related types
- `userPreferences.ts` - User preference types

### Type Naming Conventions

- Use PascalCase for type names: `TripBuilderData`, `ItineraryActivity`
- Use descriptive names: `LocationOperatingHours` not `LOH`
- Prefix domain-specific types: `Itinerary*`, `Trip*`, `Location*`

### Duplicate Types

**Known Duplicates (Intentional):**

1. **RecommendationReason** - Exists in both `itinerary.ts` and `tripDomain.ts`
   - `itinerary.ts`: Generic recommendation reason with flexible factors
   - `tripDomain.ts`: Domain-specific with structured scoring factors
   - **Reason**: Different contexts require different structures
   - **Action**: Keep separate, document the difference

2. **TravelPace vs TripStyle** - Both represent "relaxed" | "balanced" | "fast"
   - `TravelPace` in `traveler.ts` - Used in TravelerProfile
   - `TripStyle` in `trip.ts` - Used in TripBuilderData
   - **Reason**: Different domains, may diverge in future
   - **Action**: Consider aliasing or creating shared type if they remain identical

**Best Practices:**
- Document why types are duplicated if intentional
- Consider creating shared types in `src/types/common.ts` for truly shared types
- Use type aliases when types are identical: `type TripStyle = TravelPace`

## Naming Conventions

### Variables and Functions

- Use camelCase: `getUserProfile`, `tripBuilderData`
- Use descriptive names: `isAuthenticated` not `auth`
- Prefix boolean variables with `is`, `has`, `should`: `isLoading`, `hasError`

### Constants

- Use UPPER_SNAKE_CASE: `APP_STATE_STORAGE_KEY`, `MAX_EDIT_HISTORY_ENTRIES`
- Group related constants in files: `storage.ts`, `appState.ts`, `time.ts`

### Files and Directories

- Use kebab-case for files: `trip-builder.tsx`, `location-card.tsx`
- Use PascalCase for React components: `TripBuilder.tsx`, `LocationCard.tsx`
- Use camelCase for utilities: `storageHelpers.ts`, `itineraryPlanner.ts`

### Type Files

- Use singular names: `trip.ts` not `trips.ts`
- Use descriptive names: `location.ts` not `loc.ts`

## File Organization

### Directory Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── features/    # Feature-specific components
│   ├── layouts/     # Layout components
│   └── ui/          # Reusable UI components
├── context/         # React Context providers
├── data/            # Static data and mocks
├── lib/             # Utility functions and services
│   ├── api/         # API utilities
│   ├── constants/   # Constants
│   └── ...
├── state/           # State management
└── types/           # TypeScript type definitions
```

### Component Organization

- One component per file
- Co-locate related files: `LocationCard.tsx` and `LocationCard.test.tsx`
- Use index files for exports when appropriate

### Import Order

1. External dependencies (React, Next.js, etc.)
2. Internal absolute imports (`@/lib/...`)
3. Relative imports (`./Component`)
4. Type imports (`import type { ... }`)

**Example:**
```typescript
import { useState } from "react";
import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { Component } from "./Component";
import type { ComponentProps } from "./types";
```

## Magic Values

### Avoid Magic Numbers/Strings

**Bad:**
```typescript
setTimeout(() => { /* ... */ }, 500);
const history = edits.slice(-50);
localStorage.setItem("koku_app_state_v1", data);
```

**Good:**
```typescript
import { APP_STATE_DEBOUNCE_MS, MAX_EDIT_HISTORY_ENTRIES, APP_STATE_STORAGE_KEY } from "@/lib/constants";
setTimeout(() => { /* ... */ }, APP_STATE_DEBOUNCE_MS);
const history = edits.slice(-MAX_EDIT_HISTORY_ENTRIES);
localStorage.setItem(APP_STATE_STORAGE_KEY, data);
```

### When to Extract Constants

Extract to constants when:
- Value is used in multiple places
- Value has semantic meaning (not just a number)
- Value might change in the future
- Value needs documentation

## Code Duplication

### When Duplication is Acceptable

- Type definitions that serve different domains (see Duplicate Types above)
- Similar but contextually different implementations
- Temporary duplication during refactoring

### When to Refactor

- Identical code blocks in multiple files
- Copy-pasted logic that should be shared
- Repeated patterns that could be abstracted

## Best Practices

1. **Single Source of Truth**: Store constants in one place
2. **Consistent Naming**: Follow established conventions
3. **Type Safety**: Use TypeScript types, avoid `any`
4. **Documentation**: Comment complex logic and intentional duplicates
5. **Organization**: Group related code together
6. **DRY Principle**: Don't Repeat Yourself, but don't over-abstract

## Migration Notes

### Storage Keys Migration

Old hardcoded keys have been migrated to constants:
- `"koku_app_state_v1"` → `APP_STATE_STORAGE_KEY`
- `"koku_trip_builder"` → `TRIP_BUILDER_STORAGE_KEY`
- `"koku_wishlist"` → `WISHLIST_STORAGE_KEY`

Backward compatibility is maintained through exports in `wishlistStorage.ts`.
