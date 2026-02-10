# Koku Travel - Development Notes

## Project Overview
Koku Travel is a Next.js trip planning application for Japan travel. It includes a trip builder, itinerary generation, and smart prompts for meal/experience suggestions.

---

## Design System

### Typography
- **Display serif**: Instrument Serif (italic-only, weight 400) — heroes, page headers, section titles (`text-xl`+)
- **Body sans**: DM Sans — body text, form labels, functional UI headings (`text-lg` and below)
- **Mono**: Geist Mono — stats, data, IATA codes
- **Logo**: "Koku" in `font-serif italic` + "Travel" in `font-light uppercase tracking-wide`
- **Tailwind v4 gotcha**: `tailwind.config.js` `fontFamily` is IGNORED — must define in `@theme` block in `globals.css` with fallbacks
- Font imports in `src/app/layout.tsx`, `@theme` definitions in `src/app/globals.css`

### Design Tokens (Dark defaults)
| Purpose | Class | Hex |
|---------|-------|-----|
| Page bg | `bg-background` | `#1a1714` |
| Card surface | `bg-surface` | `#242019` |
| Borders | `border-border` | `#3a332a` |
| Primary text | `text-foreground` | `#f0e8dc` |
| Secondary text | `text-foreground-secondary` | `#b8ad9e` |
| Labels/captions | `text-stone` | `#9a8d7e` |
| Brand CTA | `bg-brand-primary` | `#c4504f` |
| Brand food/amber | `bg-brand-secondary` | `#daa54e` |
| Success/nature | `bg-sage` | `#3da193` |
| Warning | `text-warning` | `#d4a017` |
| Error | `bg-error` / `text-error` | `#b33025` |

### Mobile Responsiveness Patterns
- **Viewport height**: Use `h-[100dvh]` / `min-h-[100dvh]` instead of `h-screen` / `min-h-screen` (fixes mobile Safari/Chrome address bar jitter)
- **Section padding**: `py-12 sm:py-20 lg:py-28` progressive pattern for vertical rhythm
- **Touch targets**: Minimum 44px (`h-11 w-11`) for icon buttons; `py-2.5` minimum for text buttons
- **Input text size**: Use `text-base` (not `text-sm`) on inputs to prevent iOS auto-zoom on focus
- **Dropdown width**: `w-[min(16rem,90vw)]` to prevent overflow on narrow screens
- **Flex overflow**: Add `flex-wrap gap-2` to `flex justify-between` rows that may overflow on mobile
- **Touch feedback**: Add `group-active:scale-[1.02]` alongside `group-hover:scale-[1.02]` for mobile tap response
- **Safe area**: Use `pb-[env(safe-area-inset-bottom)]` for fixed-bottom elements (toasts, pills)
- **Overscroll**: Add `overscroll-contain` on horizontal scroll containers to prevent parent page scroll

### Color Rules
- **Never** use raw Tailwind colors (`gray-*`, `indigo-*`, `amber-*`, etc.)
- **Exception**: `TravelModeSelector.tsx` transport-mode colors (functional differentiators)
- Use short-form tokens (`text-charcoal`, `bg-surface`) not namespaced prefixes
- Overlays: `bg-charcoal/` not `bg-black/`; `bg-white` only on overlays against dark images/maps
- Gradients: `from-charcoal/` not `from-[#1f1a14]/`
- Border radius: `rounded-xl` for containers/cards
- Activity categories have distinct colors — see `src/lib/activityColors.ts`
- Style guide at `/ui/colors`

### Motion System (`src/lib/motion.ts`)
- 3 easing curves: `easeReveal`, `easeCinematic`, `easePageTransition`
- 6 durations: micro(0.15), fast(0.3), base(0.6), slow(0.8), cinematic(1.2), epic(2.0)
- 4 staggers: char(0.02), word(0.04), item(0.08), section(0.12)
- 3 hover scales: card(1.04), editorial(1.02), immersive(1.10)
- CSS string exports: `easeCinematicCSS`, `easeRevealCSS`, `easePageTransitionCSS`
- **Gotcha**: `as const` readonly tuples need `[...easeReveal] as [number, number, number, number]` in framer-motion `Variants` type context

---

## Sanity CMS

### Architecture
- **Studio**: Embedded at `/studio` route via `next-sanity`
- **Schemas**: `guide` + `author` + 4 singletons (`landingPage`, `siteSettings`, `tripBuilderConfig`, `pagesContent`) + custom blocks (`tipCallout`, `locationRef`, `imageGallery`)
- **Workflow**: Draft → In Review → Published → Archived (custom document actions)
- **Data Flow**: Sanity CDN for guide detail + singleton content; Supabase for list queries/bookmarks/location data
- **Dual Source**: Guide detail tries Sanity first, falls back to Supabase
- **Frontend Pattern**: All components accept optional Sanity content prop with `??` fallback to hardcoded defaults. Site never breaks if Sanity is unreachable.
- **ISR**: Landing + trip builder at `revalidate = 3600` + on-demand via webhook
- **Webhook**: `POST /api/sanity/webhook` — guides → Supabase upsert, singletons → revalidatePath

### Key Directories
| Path | Contents |
|------|----------|
| `src/sanity/schemas/` | All document + singleton + object schemas |
| `src/sanity/` | `client.ts`, `queries.ts`, `structure.ts`, `actions.ts`, `image.ts` |
| `src/lib/sanity/contentService.ts` | Fetcher functions for all 4 singletons |
| `src/types/sanitySiteContent.ts` | TS types for singleton content |
| `src/types/sanityGuide.ts` | SanityGuide, SanityAuthor types |
| `src/lib/guides/guideService.ts` | Sanity fetch functions with try/catch fallback |
| `src/components/features/guides/blocks/` | Custom Portable Text block components |

### Singleton Schemas
- **`landingPage`**: Hero text, philosophy stats, showcase acts (3), testimonials (1-5), featured headers, final CTA
- **`siteSettings`**: Brand description, newsletter text, footer nav columns, social links
- **`tripBuilderConfig`**: Vibes + regions (readOnly IDs) + 8 step content fieldsets. Logic-critical fields (interest mappings, cities) stay code-side.
- **`pagesContent`**: All non-landing page text (explore, guides, authors, favorites, dashboard, account, itinerary)

### Env Vars
| Variable | Sensitive |
|----------|-----------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | No |
| `NEXT_PUBLIC_SANITY_DATASET` | No |
| `SANITY_API_VERSION` | No |
| `SANITY_API_READ_TOKEN` | Yes |
| `SANITY_API_WRITE_TOKEN` | Yes |
| `SANITY_REVALIDATE_SECRET` | Yes |

---

## Feature Architecture

### Landing Page (`src/components/landing/`)
7 sections: HeroOpening (200vh scroll-pinned) → Philosophy (80vh stats) → ImmersiveShowcase (300vh 3-act) → FeaturedLocations (200vh horizontal scroll) → TestimonialTheater (3 editorial spreads) → FeaturedGuides (asymmetric grid) → FinalCTA

### Trip Builder (`src/components/features/trip-builder/`)
6 flat full-screen steps: Intro(0) → Dates(1) → EntryPoint(2) → Vibes(3) → Regions(4) → Review(5). Clip-path wipe transitions. `StepProgressTrack` for navigation. `GeneratingOverlay` for cinematic loading.

### Guide Article (`src/components/features/guides/`)
5-zone layout: Hero (sticky parallax) → Preamble (summary/author) → Body (editorial rhythm) → Locations (asymmetric grid) → Footer (sign-off + next guide). Article-scoped `GuideProgressBar`.

### Itinerary (`src/components/features/itinerary/`)
- **View**: 50-50 split — `ItineraryTimeline` (cards) left, `ItineraryMapPanel` (Mapbox) right
- **Guide**: Hybrid composed + template content via `src/lib/guide/guideBuilder.ts`
- **Route Optimizer**: Nearest-neighbor algorithm via `src/lib/routeOptimizer.ts`, auto-runs on generation
- **Smart Prompts**: Meal/experience suggestions via `/api/smart-prompts/recommend`
- **Travel Guidance**: Etiquette tips from `travel_guidance` table, matched by category/city/region/season

### Explore → Itinerary Integration
- Smart city matching for placement via `src/hooks/useAddToItinerary.ts`
- Saved locations queued in `TripBuilderContext` → prioritized during generation

---

## Data & Quality

### Database
- **Locations**: ~3,907 in Supabase. Coordinates: `lat`/`lng` columns. Photos in Supabase Storage.
- **Experiences**: 34 non-place entries (tours, workshops, cruises) in separate `experiences` table — excluded from explore/itinerary
- **Health Score**: 100/100 (DQ system: `npm run dq audit|fix|report`)
- **Categories**: restaurant, nature, landmark, culture, shrine, museum, park, temple, shopping, food, entertainment, market, wellness, viewpoint, bar, transport

### Gotchas
- Supabase anon key blocked by RLS on writes — use `SUPABASE_SERVICE_ROLE_KEY`
- Supabase `.select()` has 1000 row default limit — use `.range()` pagination for full exports
- `tags` column doesn't exist on locations table
- Google API cost mitigated: slim 13-field mask, contact info from DB, autocomplete LRU cache, photos from Supabase Storage

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CHEAP_MODE=true` | Skip Mapbox API calls, use heuristic travel time estimates |
| `ROUTING_PROVIDER` | `"mapbox"` or `"google"` |
| `ROUTING_MAPBOX_ACCESS_TOKEN` | Mapbox API token |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (read-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (bypasses RLS) |

## Development Commands

```bash
npm run dev              # Start dev server
npm run dq audit         # Run data quality audit
npm run dq fix --dry-run # Preview DQ fixes
npm run dq report        # Health score report
```
