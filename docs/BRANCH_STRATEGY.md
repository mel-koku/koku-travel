# Branch Strategy & File Mapping

This document maps features to their corresponding files and directories.

## Branch Structure

### Core Infrastructure

#### `feature/auth`
**Purpose:** Authentication & user management

**Files:**
- `src/lib/auth/middleware.ts`
- `src/app/auth/callback/route.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/serviceRole.ts`
- `src/lib/accountSync.ts`
- `src/app/account/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/DashboardClient.tsx`

#### `feature/sanity-integration`
**Purpose:** Sanity CMS setup and integration

**Files:**
- `src/lib/sanity/client.ts`
- `src/lib/sanity/config.ts`
- `src/lib/sanity/guides.ts`
- `src/lib/sanity/authors.ts`
- `src/lib/sanity/queries.ts`
- `src/sanity/` (all files)
- `src/app/studio/` (all files)
- `src/app/api/preview/route.ts`
- `src/app/api/preview/exit/route.ts`
- `src/app/api/revalidate/route.ts`
- `sanity.config.ts`
- `sanity.cli.ts`
- `scripts/sanity/` (all files)
- `docs/sanity-setup.md`
- `docs/sanity-authors-setup.md`

#### `feature/supabase-integration`
**Purpose:** Supabase database setup

**Files:**
- `src/lib/supabase/` (all files)
- `supabase/migrations/` (all files)
- `src/lib/storageHelpers.ts`
- `src/lib/communityStorage.ts`
- `src/lib/wishlistStorage.ts`

#### `feature/api-infrastructure`
**Purpose:** API routes & utilities

**Files:**
- `src/app/api/` (all files)
- `src/lib/api/errors.ts`
- `src/lib/api/fetchWithTimeout.ts`
- `src/lib/api/rateLimit.ts`
- `src/lib/api/validation.ts`
- `src/lib/env.ts`
- `src/lib/logger.ts`

### Feature Branches

#### `feature/guides`
**Purpose:** Guides feature with Sanity CMS

**Files:**
- `src/app/guides/page.tsx`
- `src/app/guides/[id]/page.tsx`
- `src/app/guides/bookmarks/page.tsx`
- `src/app/guides/bookmarks/BookmarksClient.tsx`
- `src/app/guides/expert/[name]/page.tsx`
- `src/app/guides/experts/page.tsx`
- `src/components/features/guides/` (all files)
- `src/types/guide.ts`
- `src/lib/sanity/guides.ts`
- `src/lib/sanity/authors.ts`

#### `feature/explore`
**Purpose:** Location discovery and exploration

**Files:**
- `src/app/explore/page.tsx`
- `src/components/features/explore/` (all files)
- `src/lib/googlePlaces.ts`
- `src/app/api/locations/` (all files)
- `src/app/api/places/` (all files)
- `src/types/location.ts`
- `src/data/locationCoordinates.ts`
- `src/data/locationEditorialSummaries.ts`
- `src/data/mockLocations.ts`
- `src/state/locationDetailsStore.ts`

#### `feature/trip-builder`
**Purpose:** Trip builder wizard

**Files:**
- `src/app/trip-builder/page.tsx`
- `src/components/features/trip-builder/` (all files)
- `src/context/TripBuilderContext.tsx`
- `src/data/interests.ts`
- `src/data/regions.ts`
- `src/types/trip.ts`

#### `feature/itinerary`
**Purpose:** Itinerary planner and management

**Files:**
- `src/app/itinerary/page.tsx`
- `src/components/features/itinerary/` (all files)
- `src/lib/itineraryPlanner.ts`
- `src/lib/itineraryGenerator.ts`
- `src/lib/itineraryLocations.ts`
- `src/types/itinerary.ts`
- `src/data/mockItinerary.ts`
- `src/lib/__tests__/itineraryPlanner.test.ts`

#### `feature/wishlist`
**Purpose:** Wishlist/favorites functionality

**Files:**
- `src/app/favorites/page.tsx`
- `src/components/features/wishlist/` (all files)
- `src/context/WishlistContext.tsx`
- `src/lib/wishlistStorage.ts`
- `supabase/migrations/20241112_create_favorites_table.sql`

#### `feature/community`
**Purpose:** Community discussions

**Files:**
- `src/app/community/page.tsx`
- `src/app/community/[id]/page.tsx`
- `src/components/features/community/` (all files)
- `src/lib/communityStorage.ts`
- `src/data/mockCommunity.ts`

#### `feature/dashboard`
**Purpose:** User dashboard & account management

**Files:**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/account/page.tsx`
- `src/lib/accountSync.ts`
- `src/components/features/itinerary/DashboardItineraryPreview.tsx`

### UI & Design System

#### `feature/ui-components`
**Purpose:** Design system & reusable components

**Files:**
- `src/components/ui/` (all files)
- `src/components/layouts/` (all files)
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/LayoutWrapper.tsx`
- `src/components/PreviewBanner.tsx`
- `src/app/ui/` (all files)
- `src/lib/cn.ts`
- `tailwind.config.js`
- `postcss.config.mjs`
- `src/app/globals.css`

### Infrastructure & Utilities

#### `feature/routing`
**Purpose:** Travel time & routing calculations

**Files:**
- `src/lib/routing/` (all files)
- `src/lib/travelTime.ts`
- `src/lib/time.ts`

#### `feature/monitoring`
**Purpose:** Error tracking & performance monitoring

**Files:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/lib/web-vitals.ts`
- `src/components/WebVitals.tsx`
- `docs/sentry-setup.md`

## Shared Files (on all branches)

These files are shared across features and should be on main:
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `eslint.config.mjs`
- `vitest.config.ts`
- `README.md`
- `.gitignore`
- `env.local.example`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/state/AppState.tsx`
- `src/types/expert.ts`
- `docs/` (shared documentation)

## Branch Naming Convention

- `feature/<feature-name>` - Feature development
- `bugfix/<issue-description>` - Bug fixes
- `hotfix/<issue-description>` - Critical production fixes
- `refactor/<component-name>` - Code refactoring
- `docs/<topic>` - Documentation updates

## Workflow

1. Create feature branch from `main`
2. Make changes related to that feature
3. Commit and push branch
4. Create pull request to `main`
5. Review and merge
6. Delete feature branch after merge

## Branch Protection Rules (Recommended)

Protect `main` branch:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Do not allow force pushes
- Do not allow deletions

