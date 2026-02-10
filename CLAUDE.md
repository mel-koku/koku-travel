# Koku Travel - Development Notes

## Project Overview
Koku Travel is a Next.js trip planning application for Japan travel. It includes a trip builder, itinerary generation, and smart prompts for meal/experience suggestions.

## Recent Work (2026-02-10)

### Sanity CMS Integration
- **Purpose**: Let non-technical local guides author content through a rich text editor with editorial review workflow
- **Studio**: Embedded at `/studio` route (Sanity Studio via `next-sanity`)
- **Schemas**: `guide` (Portable Text body, editorial status, linked locations) + `author` (name, photo, bio, city, social links) + custom blocks (`tipCallout`, `locationRef`, `imageGallery`)
- **Editorial Workflow**: Draft → In Review → Published → Archived, with custom document actions (Submit for Review, Approve & Publish, Request Changes)
- **Desk Structure**: Sidebar with Guides (Drafts / In Review / Published / Archived / All) + Authors
- **Data Flow**: Sanity CDN for detail page fetches (Portable Text + author profile), Supabase stays for list queries/bookmarks/location linking
- **Webhook Sync**: `POST /api/sanity/webhook` — validates secret, upserts summary fields to Supabase `guides` table on publish, archives on delete, calls `revalidatePath`
- **Dual Source**: Detail page tries Sanity first (`getSanityGuideWithLocations`), falls back to Supabase (`getGuideWithLocations`); existing markdown guides render unchanged via `GuideContent.tsx`
- **ISR**: Guide detail pages switched from `force-dynamic` to `revalidate = 3600` + on-demand revalidation via webhook
- **Portable Text Renderer**: `PortableTextBody.tsx` matches existing editorial styles (serif headings, variable widths, breakout images, blockquotes, styled callouts)
- **Author Profiles**: Directory at `/guides/authors`, individual at `/guides/authors/[slug]` with published guide grid
- **CSP**: `/studio` route gets relaxed CSP (`'unsafe-eval'` for Sanity scripts); all other routes unchanged
- **Sanity API Version**: `2026-02-10` (date-based, pinned in `.env.local` and code fallback)
- **Migration Script**: `scripts/migrate-guides-to-sanity.ts` (converts markdown→Portable Text, supports `--dry-run`)
- **Packages Added**: `sanity`, `@sanity/vision`, `@sanity/image-url`, `next-sanity`, `@portabletext/react`, `styled-components`

#### Key Files (Sanity CMS)

| File | Purpose |
|------|---------|
| `sanity.config.ts` | Studio config (project ID, basePath `/studio`, plugins, schema, actions) |
| `src/sanity/client.ts` | Public CDN client + authenticated write client |
| `src/sanity/image.ts` | `urlFor()` helper for Sanity image URLs |
| `src/sanity/queries.ts` | GROQ queries (guideBySlug, authorBySlug, allAuthors) |
| `src/sanity/structure.ts` | Desk structure (editorial status filters) |
| `src/sanity/actions.ts` | Custom workflow actions for guide documents |
| `src/sanity/schemas/guide.ts` | Guide document schema with Portable Text body |
| `src/sanity/schemas/author.ts` | Author document schema |
| `src/sanity/schemas/objects/*.ts` | Custom block types (tipCallout, locationRef, imageGallery) |
| `src/app/studio/[[...tool]]/page.tsx` | Embedded Sanity Studio page |
| `src/app/api/sanity/webhook/route.ts` | Webhook: Sanity → Supabase sync + revalidation |
| `src/components/features/guides/PortableTextBody.tsx` | Portable Text renderer matching editorial styles |
| `src/components/features/guides/blocks/*.tsx` | Custom block components (TipCallout, LocationEmbed, ImageGallery) |
| `src/types/sanityGuide.ts` | SanityGuide, SanityAuthor types |
| `src/lib/guides/guideService.ts` | Sanity fetch functions (with try/catch for graceful fallback) |
| `src/app/guides/[slug]/page.tsx` | Dual source: try Sanity first, fallback Supabase |
| `src/components/features/guides/GuideDetailClient.tsx` | Discriminated union props for dual source |
| `src/components/features/guides/GuidePreamble.tsx` | Author as string (legacy) or object (Sanity) with avatar + link |

#### Env Vars (Sanity)
| Variable | Sensitive | Vercel Environments |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | No | All |
| `NEXT_PUBLIC_SANITY_DATASET` | No | All |
| `SANITY_API_VERSION` | No | All |
| `SANITY_API_READ_TOKEN` | Yes | All |
| `SANITY_API_WRITE_TOKEN` | Yes | Production only |
| `SANITY_REVALIDATE_SECRET` | Yes | Production only |

### Description Quality Audit & Fix (291 locations)
- **Trigger**: Gion Corner had Gion District's description copied into it; led to full database audit
- **5 tiers of issues found and fixed**:
  - **Tier 1** (8 locations): Description described a completely different place (e.g., castle ruins had a restaurant's description)
  - **Tier 2** (5 locations): Description about a hotel/property instead of the attraction itself
  - **Tier 3** (12 locations): Generic boilerplate auto-generated text ("a notable landmark representing an important cultural site")
  - **Tier 4** (14 locations): Truncated descriptions cut off at ~50 characters without ending punctuation
  - **Tier 5** (252 locations): `description` identical to `short_description` — expanded each to 2-4 sentence paragraphs (60-200 words)
- **Category fixes** (5 locations): Gion Corner (landmark→entertainment), Suigetsu (park→food), Sunset Live (restaurant→entertainment), OkutsuSo (museum→wellness), Kiyonoya (food→wellness)
- **Writing approach**: Warm, knowledgeable voice; signature dishes for restaurants, best seasons for nature, founding history for temples, practical tips throughout; no marketing cliches
- **Verification**: Post-fix query confirms 0 remaining `description === short_description` matches
- **Scripts** (one-time use, in `scripts/`):
  - `find-desc-issues.js` — Detects Tier 3 (boilerplate patterns) and Tier 4 (truncated) locations
  - `export-tier5.js` — Exports Tier 5 locations to JSON for batch processing
  - `fix-descriptions-t1-t4.js` — Applied 35 fixes for Tiers 1-4 + category corrections
  - `fix-tier5-batch1.js`, `fix-tier5-batch2.js`, `fix-tier5-batch3.js` — Applied 252 Tier 5 expanded descriptions (84 each)
- **All fixes applied directly to Supabase** via service role key (no local data files changed)

---

## Recent Work (2026-02-09)

### Guide Article Page Redesign
- **Hero**: Full-viewport cinematic hero with sticky parallax (scale 1.05→1 on scroll), radial vignette + strong bottom gradient, title visible on first paint (no animation delay)
- **Preamble**: Breathing zone between hero and body — serif italic summary, decorative `brand-primary/40` rule, author/date in mono, bookmark icon button, tag pills with `ScrollReveal`
- **Body**: Editorial rhythm with variable-width markdown elements — h2 at `max-w-3xl` with `ScrollReveal`, body text at `max-w-2xl`, images break out to `max-w-5xl` with lazy `next/Image`, pull-quote blockquotes with decorative rule
- **Locations**: Asymmetric editorial grid — first card tall `3:4` spanning 2 rows, remaining `4:3`, gradient overlays, hover scale `1.03`, cursor integration (`"explore"`), staggered `ScrollReveal`
- **Footer**: Sign-off with author/date in mono, next guide card (full-width image with gradient, hover scale, `"read"` cursor state), back-to-guides `link-reveal` link
- **Progress bar**: Article-scoped 2px `brand-primary` bar tracking only body zone via `useScroll({ target: contentRef })`, hidden outside viewport, disabled for reduced motion
- **Scroll indicator**: Hidden on mobile (`hidden sm:block`), fades out on scroll (`scrollYProgress [0.3, 0.5]`)
- **Related guide**: `page.tsx` fetches one related guide (same city → fallback to same type), `getGuidesByType` now accepts optional `excludeId`
- **Page background**: Changed from `bg-surface` to `bg-background` (darker, cinematic)
- **New components**: `GuidePreamble.tsx`, `GuideFooter.tsx`, `GuideProgressBar.tsx`
- **Removed from GuideDetailClient**: `bg-surface` wrapper, `max-w-4xl` container, inline action bar, inline summary, old footer
- **Key files**:
  - `src/app/guides/[slug]/page.tsx` — related guide fetching
  - `src/components/features/guides/GuideDetailClient.tsx` — 5-zone layout orchestrator
  - `src/components/features/guides/GuideHero.tsx` — cinematic sticky parallax hero
  - `src/components/features/guides/GuidePreamble.tsx` — breathing zone (summary, author, bookmark, tags)
  - `src/components/features/guides/GuideContent.tsx` — editorial rhythm variable-width markdown
  - `src/components/features/guides/LinkedLocations.tsx` — asymmetric editorial grid
  - `src/components/features/guides/GuideFooter.tsx` — sign-off + next guide card
  - `src/components/features/guides/GuideProgressBar.tsx` — article-scoped reading progress
  - `src/lib/guides/guideService.ts` — `excludeId` param on `getGuidesByType`

### Landing Page Redesign
- **Typography**: Fraunces + Plus Jakarta Sans → Instrument Serif + DM Sans (Geist Mono kept for data/stats)
- **Font rule**: Instrument Serif (italic) for display headings (`text-xl`+); DM Sans for body/functional UI (`text-lg` and below)
- **Tailwind v4 note**: `tailwind.config.js` `fontFamily` is ignored — fonts must be defined in `@theme` block in `globals.css` with fallbacks
- **Hero**: Scroll-pinned typographic mask reveal — "KOKU" on dark bg, clip-path expands to full-bleed image on scroll, CTA fades in
- **Philosophy**: Full-bleed cinematic image (80vh) with centered stats (AnimatedNumber count-up)
- **ImmersiveShowcase**: 300vh scroll-pinned 3-act section replacing HowItWorks + FeatureShowcase
- **FeaturedLocations**: 200vh horizontal scroll gallery with intro text card and progress bar
- **TestimonialTheater**: Three editorial spreads (50/50 image/quote split, alternating layout)
- **FeaturedGuides**: Asymmetric grid (featured guide spans 2 cols)
- **FinalCTA**: Single CTA + text link, refined copy
- **Header**: Hidden on landing page load, fades in after hero scroll (~2.5% page scroll); stays visible through hero zone
- **Logo**: "Koku" in Instrument Serif italic + "Travel" in DM Sans light uppercase
- **New components**: `HeroOpening.tsx`, `Philosophy.tsx`, `ImmersiveShowcase.tsx`, `TestimonialTheater.tsx`, `AnimatedNumber.tsx`, `ScrollProgressBar.tsx`
- **Removed sections**: `LandingHero`, `ValuePropositionBar`, `HowItWorks`, `FeatureShowcase`, `TestimonialSection`, divider-glow elements
- **Animation additions**: `clipX` in SplitText, `explore`/`read` cursor states, `.link-reveal` CSS underline, scroll progress bar
- **Font consistency pass**: `font-serif` on display headings across all pages; placeholder colors unified to `text-stone`
- **Key files**:
  - `src/app/layout.tsx` — Instrument Serif + DM Sans + Geist Mono imports
  - `src/app/globals.css` — `@theme` font definitions with fallbacks, `.link-reveal` utility
  - `tailwind.config.js` — letter-spacing tokens (display, heading, wide, ultra)
  - `src/components/Header.tsx` — logo redesign, landing page header reveal logic
  - `src/components/landing/*.tsx` — all new/redesigned landing sections

---

## Recent Work (2026-02-08)

### Google API Cost Mitigation
- **Slim field mask**: Runtime Google Places API uses 13 fields (was 35), ~60% cost reduction per call
- **Contact info from DB**: `website_uri`, `phone_number`, `google_maps_uri` columns added to locations table; served directly from DB instead of Google API
- **Autocomplete cache**: Server-side LRU cache (100 entries, 10min TTL) + client-side debounce 500ms, min 3 chars
- **Photo storage**: 3,855 photos stored in Supabase Storage; UI serves `primary_photo_url` from DB, no more Google proxy calls
- **Parallel pagination**: Refine and filter-options endpoints fetch location pages in parallel instead of sequentially
- **Key files**:
  - `src/lib/googlePlaces.ts` — slim field mask, reduced API calls
  - `src/lib/google/cache.ts` — server-side autocomplete LRU cache
  - `src/app/api/places/autocomplete/route.ts` — cache integration
  - `src/app/api/locations/[id]/route.ts` — serves contact info from DB
  - `src/types/location.ts` — added `websiteUri`, `phoneNumber`, `googleMapsUri`, `primaryPhotoUrl`

### Gemini Enrichment (40 batches — COMPLETE)
- **Fields**: `name_japanese` (3,540), `nearest_station` (3,395), `cash_only` (2,360), `reservation_info` (577)
- **Partial fills**: `website_uri`, `phone_number`, `min_budget` (null-only, don't overwrite existing)
- **Scripts** (gitignored): `export-enrichment-gaps.ts`, `import-gemini-enrichment-v2.ts`

### CITY_IS_PREFECTURE Fix (DQ score 94 → 100)
- **Problem**: 1,044 locations had prefecture name in `city` field instead of actual city
- **Solution**: Gemini batch pipeline — export locations with coordinates, Gemini resolves correct city
- **Results**: 430 cities corrected, 617 confirmed same-name (prefecture = capital city), 1 not found
- **Manual fixes**: Bank of Iwate Red Brick Building (Iwate → Morioka), Okinawa City added as exception
- **DQ rule update**: `PREFECTURE_CITY_EXCEPTIONS` expanded from 3 → 28 same-name capitals
- **Scripts** (gitignored): `export-city-fix-batches.ts`, `import-city-fix-results.ts`
- **npm scripts**: `city-fix:export`, `city-fix:import`, `city-fix:import:dry`

### Category Audit & Fix (334 locations recategorized in 2 rounds)
- **Round 1** (keyword analysis): 243 fixes — eliminated "attraction" and "experience" categories
  - landmark → nature: 92, attraction → nature: 40, culture → nature: 21, attraction → culture: 15, attraction → landmark: 15, attraction → food: 11, bar → food: 8, landmark → shopping: 8, landmark → culture: 7, others: 26
- **Round 2** (deep audit — beaches, bridges, mountains, onsen, theme parks, museums): 91 fixes
  - 52 → nature (18 beaches, 13 flower parks/highlands, 4 mountains, 6 rivers/lakes, vine bridge, 5 forests/volcano/coast, 5 misc nature)
  - 10 → landmark (9 bridges, Ishikawa Gate)
  - 7 → wellness (6 onsen towns + Manza Onsen)
  - 6 → entertainment (Huis Ten Bosch, Kamogawa Seaworld, Senbonmatsu, ski resort, paragliding, Mini Train Park)
  - 5 → culture (2 sekibutsu, Gion AYA, sake brewery street, Omihachiman)
  - 3 → museum (Wooden Bridge Museum, Manga Museum, Toyama Art Museum)
  - 3 → shopping (Kyu-Karuizawa Ginza, Oharaimachi, Orange Street)
  - 2 → viewpoint (Mount Moiwa Ropeway, Mt. Hachiman Ropeway)
  - 1 → food, 1 → transport, 1 → park
- **Final distribution**: restaurant 1040, nature 639, landmark 584, culture 340, shrine 264, museum 237, park 215, temple 151, shopping 147, food 110, entertainment 57, market 50, wellness 45, viewpoint 44, bar 16, transport 2
- **Scripts** (gitignored): `scripts/fix-categories.ts` (Round 1)

### Data Quality Status
- **Health Score**: 100/100
- **Remaining issues** (low/info only): `COORDINATES_PRECISION_LOW` (468 info), `MISSING_PRIMARY_PHOTO` (83 low), `NAME_CITY_MISMATCH` (2 medium)
- **DQ scripts**: Now fully gitignored under `scripts/` (local-only tooling, not needed in production)
- **43 rules** across 6 categories: names, descriptions, duplicates, categories, completeness, google

---

## Recent Work (2026-02-07)

### Features

#### Design System Color Overhaul
- **Purpose**: Replace flat earthy palette with a warm, atmospheric color system
- **Palette**:
  - **Dominant**: Warm parchment `#faf5ef`, cream surfaces `#f2ebe0`, gilded sand borders `#e3d5c3`
  - **Structure**: Deep crimson `#8c2f2f`, lantern amber `#c6923a`, dark wood `#1f1a14`, warm brown `#5a4f44`, stone `#9a8d7e`
  - **Accent**: Jade teal `#2d7a6f`, bright gold `#d4a017`, vermillion `#b33025`
- **Scope**: 72 files across entire codebase — globals.css, tailwind.config.js, all pages, all components
- **Key Changes**:
  - Updated CSS custom properties (light + dark mode) in `globals.css`
  - Category-differentiated activity colors in `activityColors.ts` (culture=crimson, food=amber, nature=jade, shopping=gold, travel=gray, hotel/note=stone)
  - Replaced all `earthy-*` and `neutral-*` namespaced tokens with short-form (`text-charcoal`, `bg-surface`, `text-stone`)
  - Replaced raw Tailwind colors (`amber-*`, `indigo-*`, `gray-*`) with design tokens
  - Replaced hardcoded hex values in map components (RegionMap, TripMap, ItineraryMap, ItineraryMapPanel)
  - Updated map pin colors per activity category
  - Added color palette style guide page at `/ui/colors`
  - Warm-tinted box shadows using `rgba(31, 26, 20, ...)` instead of pure black
- **Exceptions**: `TravelModeSelector.tsx` keeps raw Tailwind colors (functional transport-mode differentiators)
- **Removed**: Community page prototype (14 files — unused, localStorage-only, no API/DB, hidden from nav)

#### Itinerary Guide — Location-Aware Content
- **Purpose**: Make guide segments reference actual place names and descriptions so they feel specific and useful instead of generic category-based text
- **Architecture**: Hybrid approach — composed content for intros/transitions/summaries + template-based for cultural moments, tips, and trip overviews
- **Files**:
  - `src/types/itinerary.ts` - Added `description?: string` to place activity
  - `src/types/itineraryGuide.ts` - Added `beforeActivityId?: string` to GuideSegment for prep content placement
  - `src/lib/itineraryGenerator.ts` - Populates `description` from Location objects during generation
  - `src/lib/guide/templateMatcher.ts` - Added phrase pools (`DAY_INTRO_OPENERS`, `TRANSITION_BRIDGES`, `SUMMARY_OPENERS`), city-specific openers, `pickPhrase()` and `pickDayIntroOpener()` helpers
  - `src/lib/guide/guideBuilder.ts` - Replaced template lookups for intros/transitions/summaries with `composeDayIntro()`, `composeTransition()`, `composeDaySummary()`
  - `src/components/features/itinerary/ItineraryTimeline.tsx` - Renders `beforeActivityId` segments before the activity card (cultural insights, tips prep users)
  - `src/components/features/itinerary/ItineraryShell.tsx` - Guide defaults to on
  - `src/components/features/itinerary/DaySuggestions.tsx` - Default collapsed
  - `src/components/features/itinerary/DayTips.tsx` - Default collapsed
  - `src/data/guide/practicalTips.ts` - Removed hardcoded "Shinjuku" from station-navigation tip
  - `src/components/features/itinerary/GuideSegmentCard.tsx` - Collapsible card with type-specific styling (new)
  - `src/components/features/itinerary/GuideToggle.tsx` - Toggle button with localStorage persistence (new)
  - `src/data/guide/*.ts` - 6 template data files for cultural moments, tips, overviews (new)
  - `src/lib/guide/guideBuilder.ts` - Guide orchestrator (new)
  - `src/lib/guide/templateMatcher.ts` - Template index + fallback chain lookup (new)
- **Composed Segments**:
  - **Day Intro**: City-specific opener + actual activity name listing + optional first description
  - **Transitions**: Bridge phrase + next activity name + description (between ALL consecutive activities, capped at 3/day)
  - **Day Summary**: Wrap-up opener + first/last activity reference + city closer
- **Prep Placement**: Cultural insights and practical tips use `beforeActivityId` to appear before the relevant activity (preps users before visiting)
- **Fallbacks**: When no activities exist, falls back to original template-based content
- **Defaults**: Guide on by default; day suggestions and travel tips collapsed by default

### Key Files (Itinerary Guide)

| File | Purpose |
|------|---------|
| `src/lib/guide/guideBuilder.ts` | Orchestrates building TripGuide with composed + template content |
| `src/lib/guide/templateMatcher.ts` | Phrase pools, deterministic picking, fallback-chain lookup |
| `src/data/guide/practicalTips.ts` | 32 practical tip templates (generic, no city-specific refs) |
| `src/data/guide/culturalMoments.ts` | Cultural moment templates keyed by sub-category + city |
| `src/components/features/itinerary/GuideSegmentCard.tsx` | Collapsible card UI for guide segments |
| `src/components/features/itinerary/ItineraryTimeline.tsx` | Renders before/after activity segments |

---

## Recent Work (2026-02-06)

### Features

#### Explore → Itinerary Integration
- **Purpose**: Improve the "Add to Itinerary" flow from Explore page with smart placement and queuing
- **Files**:
  - `src/types/trip.ts` - Added `savedLocationIds` field to TripBuilderData
  - `src/context/TripBuilderContext.tsx` - Added sanitization and persistence for saved locations
  - `src/hooks/useAddToItinerary.ts` - Smart city matching and queue-or-add logic
  - `src/lib/itineraryGenerator.ts` - Include saved locations in trip generation
  - `src/lib/server/itineraryEngine.ts` - Pass savedLocationIds through generation
  - `src/lib/api/schemas.ts` - Updated schemas to accept savedLocationIds
  - `src/app/api/itinerary/plan/route.ts` - Accept savedLocationIds in API
  - `src/app/trip-builder/page.tsx` - Pass saved locations when generating trip
  - `src/components/features/trip-builder/ReviewStep.tsx` - Show queued locations
  - `src/components/features/trip-builder/SavedLocationsPreview.tsx` - New component for displaying queued locations
- **Behavior**:
  - **Add button with no trips**: Queues location in TripBuilderContext + adds to favorites, shows "Plan Trip" action
  - **Add button with trips**: Uses smart city matching to place in correct day + adds to favorites
  - **Smart placement**: Finds best day based on city matching (checks activities, dateLabel, cityId)
  - **Fallback**: If no city match found, adds to last day
  - **Outside TripBuilderProvider**: Falls back to auto-creating a new trip (backwards compatible)
- **Review Step**: Shows "Saved Places" section with:
  - Mini cards for each queued location with image, name, city
  - Warning badge if location city not in selected cities
  - Remove button on each card
- **Generation**: Saved locations are prioritized at start of each day for their city

### Key Files (Explore Integration)

| File | Purpose |
|------|---------|
| `src/hooks/useAddToItinerary.ts` | Core logic for adding locations with smart placement |
| `src/context/TripBuilderContext.tsx` | Persists savedLocationIds queue in localStorage |
| `src/lib/itineraryGenerator.ts` | Includes saved locations in generated itinerary |
| `src/components/features/trip-builder/SavedLocationsPreview.tsx` | UI for queued locations in Review step |

---

## Recent Work (2026-02-05)

### Features

#### Route Optimizer Integration
- **Files**:
  - `src/lib/server/itineraryEngine.ts` - Added route optimization during initial generation
  - `src/app/api/itinerary/optimize-route/route.ts` - New API endpoint for on-demand optimization
  - `src/components/features/itinerary/ItineraryShell.tsx` - Added "Optimize Route" button
  - `src/lib/routeOptimizer.ts` - Existing nearest-neighbor algorithm (unchanged)
- **Changes**:
  - Activities are now automatically ordered geographically when a trip is first generated
  - Users can manually re-optimize route order after adding/editing activities via "Optimize Route" button
  - Uses nearest-neighbor algorithm starting from trip entry point (airport/station)
  - Each day is optimized independently (users typically return to hotels at end of each day)
- **How it works**:
  1. **Initial generation**: `generateTripFromBuilderData()` now calls `optimizeItineraryRoutes()` before `planItinerary()`
  2. **On-demand**: Button in ItineraryShell calls `/api/itinerary/optimize-route` which reorders activities and triggers replanning
- **Algorithm**: Nearest-neighbor with haversine distance calculation
  - Starts from entry point coordinates
  - Iteratively picks the nearest unvisited activity
  - Preserves note activities in their original positions
  - Returns stats: `optimizedCount`, `skippedCount`, `orderChanged`

### Key Files (Route Optimizer)

| File | Purpose |
|------|---------|
| `src/lib/routeOptimizer.ts` | Core optimization algorithm (nearest-neighbor with haversine) |
| `src/lib/server/itineraryEngine.ts` | Integrates optimizer into trip generation flow |
| `src/app/api/itinerary/optimize-route/route.ts` | API for on-demand route optimization |
| `src/lib/itineraryCoordinates.ts` | Helper to extract coordinates from activities |

---

## Recent Work (2026-02-02)

### Features

#### Responsible Travel Guidance Feature (Phase 1 MVP)
- **Files**:
  - `supabase/migrations/20260202000000_create_travel_guidance.sql`
  - `src/types/travelGuidance.ts`
  - `src/lib/tips/guidanceService.ts`
  - `src/lib/tips/tipGenerator.ts`
  - `src/components/features/itinerary/ActivityTip.tsx`
  - `src/components/features/itinerary/PlaceActivityRow.tsx`
  - `scripts/extract-guidance.ts`
- **Changes**:
  - Created `travel_guidance` table for storing etiquette and cultural tips
  - Added new "etiquette" tip type to existing tip system (indigo color)
  - Created `guidanceService.ts` for querying/matching travel guidance
  - Extended `generateActivityTips` to async version that includes DB-sourced etiquette tips
  - Tips are matched based on location category, city, region, tags, and season
  - Seeded 19 initial tips covering: temple/shrine, dining, transit, onsen, general cultural
- **Tip Matching Logic**:
  - Category match: +10 points (most important)
  - Location ID match: +15 points (highest specificity)
  - City match: +5 points
  - Region match: +3 points
  - Season match: +4 points (or -5 if mismatched)
  - Universal tips always match with base priority
- **Commands**:
  - `npm run guidance:seed` - Seed initial etiquette tips
  - `npm run guidance:list` - List all tips in database
  - `npx tsx scripts/extract-guidance.ts --url <url>` - Extract tips from URL
  - `npx tsx scripts/extract-guidance.ts --import <file>` - Import tips from JSON

### Key Files (Travel Guidance)

| File | Purpose |
|------|---------|
| `src/lib/tips/guidanceService.ts` | Fetches/matches guidance from database |
| `src/lib/tips/tipGenerator.ts` | Generates all activity tips including etiquette |
| `src/types/travelGuidance.ts` | TravelGuidance type definitions |
| `scripts/extract-guidance.ts` | Script to extract/import guidance tips |

#### Unified Data Quality System
- **Structure**:
  ```
  scripts/data-quality/
  ├── dq.ts              # Main CLI entry point
  ├── overrides.json     # Manual corrections config
  ├── lib/               # Core utilities (db, cli, utils, googlePlaces, report)
  ├── rules/             # Detection rules (names, descriptions, duplicates, categories, completeness, google)
  └── fixers/            # Fix handlers (names, descriptions, duplicates, categories)
  ```
- **Rules** (20 total):
  - **Names**: EVENT_NAME_MISMATCH, NAME_ID_MISMATCH, ALL_CAPS_NAME, BAD_NAME_START, GENERIC_PLURAL_NAME, GENERIC_ARTICLE_NAME, TRUNCATED_NAME
  - **Descriptions**: ADDRESS_AS_DESC, TRUNCATED_DESC, MISSING_DESC, SHORT_INCOMPLETE_DESC, GENERIC_DESC
  - **Duplicates**: DUPLICATE_SAME_CITY, DUPLICATE_MANY
  - **Categories**: EVENT_WRONG_CATEGORY
  - **Completeness**: MISSING_COORDINATES, MISSING_PLACE_ID
  - **Google**: GOOGLE_TYPE_MISMATCH, GOOGLE_AIRPORT_MISMATCH, GOOGLE_CONTENT_MISMATCH
- **Commands**:
  - `npm run dq audit` - Run full audit (all rules)
  - `npm run dq audit --rules=names` - Audit specific category
  - `npm run dq audit --rules=google` - Audit Google Places mismatches only
  - `npm run dq audit --severity=high` - Filter by minimum severity
  - `npm run dq audit --json` - Output JSON format
  - `npm run dq fix --dry-run` - Preview fixes without applying
  - `npm run dq fix` - Apply all available fixes
  - `npm run dq fix --type=ALL_CAPS_NAME` - Fix specific issue type
  - `npm run dq report` - Generate health report with score
  - `npm run dq report --detailed` - Detailed breakdown by type
  - `npm run dq list` - List all rules and fixers
- **Configuration**: Manual overrides in `scripts/data-quality/overrides.json`
  - `names`: locationId → correct name
  - `descriptions`: locationId → correct description
  - `duplicates`: keep/delete pairs with reasons
  - `categories`: locationId → correct category

#### Google Places Enrichment Validation
- **Files**: `scripts/enrich-missing-places.ts`, `scripts/enrich-google-places-full.ts`
- **Problem**: Enrichment scripts blindly accepted first Google search result, causing data corruption (e.g., restaurant getting airport's place_id)
- **Fix**: Added `validateMatch()` function with comprehensive checks:
  - Type incompatibility (food location can't be airport/hospital/school)
  - Airport type requires "airport" in name
  - Name similarity using Jaccard coefficient (minimum 0.3)
  - Distance validation using haversine formula (maximum 5km)
- **Result**: Scripts now skip suspicious matches and log rejection reasons

### Key Files (Data Quality)

| File | Purpose |
|------|---------|
| `scripts/data-quality/dq.ts` | Main CLI entry point |
| `scripts/data-quality/rules/google.ts` | Google Places mismatch detection rules |
| `scripts/data-quality/lib/types.ts` | Type definitions for issues, rules, fixers |
| `scripts/data-quality/overrides.json` | Manual corrections configuration |
| `scripts/enrich-missing-places.ts` | Google Places enrichment with validation |

---

## Recent Work (2026-02-01)

### Features

#### Day Start Time Selection
- **Files**: `src/types/trip.ts`, `src/context/TripBuilderContext.tsx`, `src/components/features/trip-builder/EssentialsForm.tsx`, `src/lib/server/itineraryEngine.ts`, `src/lib/api/schemas.ts`, `src/components/features/itinerary/ItineraryShell.tsx`
- **Changes**:
  - Added `dayStartTime` field to TripBuilderData type (HH:MM format, 24-hour)
  - Added time picker UI in EssentialsForm with quick-select buttons (8:00 AM, 9:00 AM, 10:00 AM, 11:00 AM)
  - Integrated `planItinerary` into initial generation to calculate actual activity times
  - Activities now display actual times (e.g., "9:30 AM") instead of "Morning/Afternoon/Evening"
  - Default: 9:00 AM when no time selected
- **Key change**: `itineraryEngine.ts` now calls `planItinerary` during generation, not as a separate step

#### Itinerary View Redesign
- **Files**: `ItineraryShell.tsx`, `PlaceActivityRow.tsx`, `DaySelector.tsx`, `TravelSegment.tsx`, `ItineraryTimeline.tsx`, `ItineraryMapPanel.tsx`, `TripSummary.tsx`, `ItineraryMap.tsx`
- **Changes**:
  - Redesigned activity cards with large 16:9 images on top, vertical layout
  - Added numbered pins to Mapbox map markers
  - Removed List/Calendar view toggle (single unified view)
  - Changed day selector from chips to dropdown with date format ("Feb 11, Tue · Kobe")
  - Made Trip Summary collapsible
  - Changed layout to 50-50 split (cards left, sticky map right)
  - Aligned travel segments with activity cards
  - Removed entry points from itinerary display
  - Removed heart/favorite button from cards (wasn't connected to visible favorites list)
  - Changed default travel mode to train (walk only if < 1km)

#### Enable Cheap Mode for Instant Travel Time Calculations
- **File**: `.env.local`
- **Change**: Added `CHEAP_MODE=true` to skip Mapbox API calls
- **Impact**: Travel time calculations now use instant heuristic estimates instead of sequential API calls
- **Why**: Previous implementation made 1-2 Mapbox API calls per activity sequentially, causing 30+ second delays for multi-activity days

#### Remove place_id Requirement from Explore/Search
- **Files**: `src/lib/locations/locationService.ts`, `src/app/api/locations/route.ts`, `src/app/api/locations/search/route.ts`, `src/app/api/cities/route.ts`, `src/app/api/locations/filter-options/route.ts`
- **Change**: Removed `place_id` requirement from database queries
- **Impact**: Makes 1,819 previously hidden locations visible in explore/search
  - Total locations: ~4,385 (was ~2,566)
  - All hidden locations have: images, coordinates, descriptions, operating hours
- **Why safe**: `placeId` is optional in Location type, frontend handles missing placeId gracefully

### Fixes Completed

#### 1. Trip Builder 400 Error on Itinerary Generation
- **File**: `src/lib/api/schemas.ts`
- **Issue**: Schema validation failed because `entryPointSchema` used `.strict()` but didn't include `region` field
- **Fix**: Added `region: knownRegionIdSchema.optional()` to `entryPointSchema`

#### 2. Page Not Scrolling to Top on Step Change
- **File**: `src/components/features/trip-builder/TripBuilderV2.tsx`
- **Issue**: `window.scrollTo` didn't work because scrollable container was a nested div with `overflow-y-auto`
- **Fix**: Added `scrollContainerRef` and scroll both container and window in `goToStep`

#### 3. Smart Prompts API Not Finding Restaurants
- **File**: `src/app/api/smart-prompts/recommend/route.ts`
- **Issues**:
  1. Case-sensitivity: Database stores "Kyoto" but app sends "kyoto" - Fixed with `.ilike()` instead of `.eq()`
  2. Category mismatch: API filtered `category = "restaurant"` but data uses `category = "food"` - Fixed with `.in("category", ["restaurant", "food"])`
  3. `place_id` requirement: Excluded locations without Google Places data - Removed the filter
  4. `business_status` filter bug: SQL `NULL != value` returns NULL, excluding rows with null status - Fixed with `.or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")`

#### 4. Meal Type Filtering (Breakfast/Lunch/Dinner)
- **File**: `src/app/api/smart-prompts/recommend/route.ts`
- **Issue**: Brewery was suggested for breakfast
- **Fix**: Added `filterByMealType` function that:
  - Excludes bars, breweries, pubs, wine bars, cocktail bars, izakayas, night clubs from breakfast
  - Uses `mealOptions` data (servesBreakfast, servesLunch, servesDinner) when available
  - Checks operating hours:
    - Breakfast: excludes places opening after 11am
    - Lunch: excludes places opening after 5pm (dinner-only)
    - Dinner: excludes places closing before 6pm

### Database Notes

#### Food Data Coverage
Cities with food location data (category = "food"):
- Kanazawa: 25 locations (no Google Places enrichment - missing mealOptions, operating hours)
- Kobe: 46 locations
- Kyoto, Fukuoka: Have enriched data with Google Places info

#### Data Quality
Locations without `place_id` or Google Places data:
- Now visible in explore/search (previously hidden)
- Will be recommended in smart prompts
- Meal type filtering relies on keyword heuristics when Google data unavailable
- For better meal-appropriate suggestions, locations need Google Places enrichment

### Key Files

| File | Purpose |
|------|---------|
| `src/app/api/smart-prompts/recommend/route.ts` | API for meal/experience suggestions |
| `src/hooks/useSmartPromptActions.ts` | Client hook for accepting smart prompts |
| `src/lib/smartPrompts/gapDetection.ts` | Detects gaps in itinerary (missing meals, etc.) |
| `src/services/trip/activityOperations.ts` | Pure functions for itinerary manipulation |
| `src/app/api/itinerary/refine/route.ts` | API for day refinement (too busy, more food, etc.) |

#### 5. Meal Suggestion Variety and Keyword Filtering
- **Files**: `src/lib/mealPlanning.ts`, `src/app/api/smart-prompts/recommend/route.ts`
- **Issues**:
  1. Same restaurant returned every time (no randomization)
  2. Inappropriate places for breakfast (izakayas, ramen, soft serve) when no Google data
- **Fixes**:
  1. Added randomization - picks randomly from top 5 candidates instead of always #1
  2. Added keyword-based filtering fallback for places without Google data:
     - `NOT_BREAKFAST_KEYWORDS`: izakaya, bar, ramen, sukiyaki, yakiniku, yakitori, etc.
     - `BREAKFAST_KEYWORDS`: cafe, coffee, breakfast, brunch, bakery, etc.
     - `DESSERT_KEYWORDS`: soft serve, ice cream, dessert, etc. (excluded from breakfast)

#### 6. Map Pin and Card Number Alignment
- **Files**: `src/components/features/itinerary/ItineraryMapPanel.tsx`, `src/components/features/itinerary/ItineraryTimeline.tsx`
- **Issue**: Clicking a map pin didn't highlight the correct activity card (numbering mismatch)
- **Fix**: Both map pins and cards now use 1-indexed numbering for activities
  - Activities: numbered 1, 2, 3... (matching between map and cards)
  - Entry points (start/end): use "S" and "E" labels instead of numbers

### Deleted Files (Calendar View Removal)
- `ViewModeToggle.tsx` - No longer needed (single view)
- `ItineraryCalendarView.tsx` - Calendar view removed
- `TimelineActivityBlock.tsx`, `TimelineGrid.tsx`, `TimelineTravelBlock.tsx`, `CurrentTimeIndicator.tsx` - Calendar-specific components

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `CHEAP_MODE=true` | Skip Mapbox API calls, use heuristic travel time estimates (instant) |
| `ROUTING_PROVIDER` | Routing provider preference ("mapbox" or "google") |
| `ROUTING_MAPBOX_ACCESS_TOKEN` | Mapbox API token for routing |

### Potential Future Work

1. **Google Places Enrichment for Kanazawa**: Run enrichment script to add `place_id`, `mealOptions`, `operating_hours` to Kanazawa food locations for better meal filtering (keyword heuristics work but Google data is more accurate)
2. **Parallelize routing API calls**: If disabling cheap mode, optimize `itineraryPlanner.ts` to make routing calls in parallel instead of sequentially

## Development Commands

```bash
# Start dev server
npm run dev

# Query database (example)
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('locations').select('name, category').ilike('city', 'kanazawa').limit(5).then(console.log);
"

# Test smart prompts API
curl -s -X POST http://localhost:3000/api/smart-prompts/recommend \
  -H "Content-Type: application/json" \
  -d '{"gap":{"id":"test","type":"meal_gap","dayId":"day-1","dayIndex":0,"action":{"type":"add_meal","mealType":"breakfast","timeSlot":"morning"}},"dayActivities":[],"cityId":"kanazawa","tripBuilderData":{"dates":{}},"usedLocationIds":[]}' | jq .
```
