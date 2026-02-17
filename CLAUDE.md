# Koku Travel - Development Notes

## Project Overview
Next.js trip planning app for Japan travel — trip builder, itinerary generation, smart prompts for meals/experiences.

---

## Design System

### Typography
- **Display/Headings**: Instrument Serif — `font-serif italic` (heroes, page headers, section titles, card titles, logo "KOKU")
- **Body**: DM Sans — `font-sans` (body text, form labels, functional UI)
- **Mono**: Geist Mono — `font-mono` (stats, data, IATA codes, nav numbers)
- **v4 gotcha**: `tailwind.config.js` `fontFamily` is IGNORED — define in `@theme` block in `globals.css`
- Font imports in `src/app/layout.tsx`, `@theme` in `src/app/globals.css`

#### Utility Classes
- **`.eyebrow-editorial`**: `text-[11px] font-medium uppercase tracking-[0.2em] text-foreground-secondary`
- **`.eyebrow-mono`**: `font-mono text-xs uppercase tracking-wide text-foreground-secondary`
- **`.serif-body`**: `font-serif italic` (guide prose)
- Display/section headings use `font-serif italic` directly (no utility class)

### Design Tokens (Dark defaults — warm palette)
| Purpose | Class | Hex |
|---------|-------|-----|
| Page bg | `bg-background` | `#1a1714` |
| Canvas (tonal lift) | `bg-canvas` | `#2e2720` |
| Card surface / Cream | `bg-surface` / `bg-cream` | `#242019` |
| Borders / Sand | `border-border` / `bg-sand` | `#3a332a` |
| Primary text | `text-foreground` | `#f0e8dc` |
| Body text (articles) | `text-foreground-body` | `foreground @ 85%` |
| Secondary / Warm gray | `text-foreground-secondary` / `text-warm-gray` | `#b8ad9e` |
| Labels/captions | `text-stone` | `#9a8d7e` |
| Brand CTA | `bg-brand-primary` | `#c4504f` |
| Brand secondary / Terracotta | `bg-brand-secondary` / `bg-terracotta` | `#daa54e` |
| Success / Sage | `bg-sage` / `bg-success` / `text-success` | `#3da193` |
| Warning | `text-warning` | `#d4b83d` |
| Error | `bg-error` / `text-error` | `#d44535` |
| Charcoal (overlays) | `bg-charcoal` | `#1f1a14` |

- **Tonal rhythm**: Alternate `bg-background`/`bg-canvas` — no explicit dividers. `bg-canvas` on: Philosophy, FeaturedExperiences, GuidePreamble.

### Color Rules
- **Never** use raw Tailwind colors (`gray-*`, `indigo-*`, `amber-*`). Exception: `TravelModeSelector.tsx` transport-mode colors.
- Use short-form tokens (`text-charcoal`, `bg-surface`) not namespaced prefixes
- Overlays: `bg-charcoal/` not `bg-black/`; `bg-white` only on overlays against dark images/maps
- Gradients: `from-charcoal/` not `from-[#1f1a14]/`
- Border radius: `rounded-xl` for cards, containers, badges, buttons, inputs
- `brand-primary` for: CTA buttons, focus rings, progress bars, card hover text, decorative accents (`bg-brand-primary/40`, `border-brand-primary/30`), hover underlines
- Activity categories have distinct cool colors — see `src/lib/itinerary/activityColors.ts`
- Style guide at `/ui/colors`

### Spacing

#### Section Spacing Tiers
| Tier | Pattern | Used For |
|------|---------|----------|
| **Editorial** | `py-12 sm:py-20 lg:py-28` | Landing, guide/experience articles, footer |
| **Functional** | `py-12 sm:py-16 lg:py-20` | Dashboard, account, favorites, explore |
| **Grand CTA** | `py-24 sm:py-32 lg:py-40` | FinalCTA only |

#### Horizontal Padding
| Pattern | Classes | Used For |
|---------|---------|----------|
| **Listing pages** | `px-4 sm:px-6 lg:px-8` | Explore, guides, experiences, dashboard, favorites, account, Container.tsx |
| **Editorial** | `px-6` (flat) | Landing sections, article body, preamble, footer |
| **Hero content** | `px-6 sm:px-8 lg:px-12` | Guide/experience hero overlays |

### Mobile Responsiveness
- **Viewport height**: `h-[100dvh]` not `h-screen` (mobile address bar fix)
- **Touch targets**: Min 44px — `h-11 w-11` icons, `h-12` inputs, `py-2.5` text buttons, `min-h-[44px]` labels
- **Input text size**: `text-base` on all inputs (prevents iOS auto-zoom)
- **Dropdown width**: `w-[min(16rem,90vw)]`
- **Flex overflow**: `flex-wrap gap-2` on `flex justify-between` rows
- **Touch feedback**: `active:scale-[0.98]` on CTAs
- **Safe areas**: `pt-[env(safe-area-inset-top)]` header, `pb-[env(safe-area-inset-bottom)]` fixed-bottom
- **Overscroll**: `overscroll-contain` on horizontal scroll containers
- **Scroll snap**: `snap-x snap-mandatory` + `snap-start` for carousels
- **Desktop/mobile splits**: Scroll-driven sections use `hidden lg:block` / `lg:hidden` for simplified mobile layouts
- **Responsive text**: Articles `text-base sm:text-lg`; masonry `columns-1 sm:columns-2`

### Motion System (`src/lib/motion.ts`)
- **Curves**: `easeReveal` `[0.33, 1, 0.68, 1]`, `easeCinematic` `[0.215, 0.61, 0.355, 1]`, `easePageTransition` `[0.76, 0, 0.24, 1]`, `easeScrollIndicator` `[0.45, 0, 0.55, 1]`
- **Durations**: micro(0.15), fast(0.3), base(0.6), slow(0.8), cinematic(1.2), epic(2.0)
- **Staggers**: char(0.02), word(0.04), item(0.08), section(0.12)
- **Parallax**: `parallaxHero` 1.08→1 scale, `parallaxSection` 1.05→1, `parallaxSubtle` 0→8% Y, `parallaxZoomIn` 1→1.08
- **Springs**: `springInteraction` (300/20), `springNavigation` (300/30), `springCursor` (10000/500/0.1)
- **CSS exports**: `easeCinematicCSS`, `easeRevealCSS`, `easePageTransitionCSS`
- **Gotcha**: `as const` tuples need `[...easeReveal] as [number, number, number, number]` in Variants context
- **Gotcha**: `tailwind.config.js` `letterSpacing` IGNORED in v4 — define `--tracking-*` in `@theme`

#### Page Transitions (`src/components/PageTransition.tsx`)
Two-phase: instant opacity cover → circle clip-path reveal. Lenis paused, scroll reset while covered. Reduced motion: simple scroll-to-top.

#### SplitText
Reserved for arrival moments only — max ~2 per page. Everything else uses ScrollReveal or static.

#### ScrollReveal (`src/components/ui/ScrollReveal.tsx`)
Direction-based reveal (`up`/`down`/`left`/`right`/`none`). Props: `distance`, `duration`, `delay`, `once`, `margin`, `scale`, `stagger`.

#### Card Hover States
- **Image cards** (Guide, Location, Experience): `group-hover:scale-[1.04]` image + `group-hover:text-brand-primary` title + optional `hover:-translate-y-1 hover:shadow-lg`
- **Editorial cards** (LinkedLocations, GuideFooter, FeaturedGuides): `group-hover:scale-[1.02]` image + gradient fade
- **Interactive cards** (AuthorCard, LocationEmbed): `hover:border-brand-primary/30 hover:shadow-lg`
- **CTAs**: `hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]`

#### Magnetic Hover (`src/components/ui/Magnetic.tsx`)
Isolated CTA buttons only (hero, FinalCTA, trip builder start). Never grid cards. Disabled on touch/reduced-motion. Presets: `magneticCTA` (0.3/20px/120px), `magneticSubtle` (0.12/8px/80px).

#### Custom Cursor (`src/components/ui/CustomCursor.tsx`)
States: dot, ring (link), icon/plus (view), crosshair (explore), labeled ring (read), dot (drag), hidden. `mix-blend-difference`. Disabled on touch/reduced-motion.

### Copy Voice
- **Say less** — cut filler, hedging, inflated verbs
- **Trust the UI** — don't restate what's visible
- **Talk to the person** — "We'll route from there" not "helps us plan smarter routes"
- **Consequences not mechanics** — tooltips say what happens, not how
- **Be concrete** — "Mix of sightseeing and downtime" not "A bit of everything"
- **Neutral empty states** — "Not set" not "None yet"
- **Plain errors** — periods, no hedging, say what to do
- **Grounded loading** — "Working out the routes..." not "Mapping the best routes..."
- **Ownership CTAs** — "Build My Itinerary" not "Generate Itinerary"

---

## Sanity CMS

### Architecture
- **Studio**: `/studio` via `next-sanity`
- **Schemas**: `guide` + `experience` + `author` + 4 singletons (`landingPage`, `siteSettings`, `tripBuilderConfig`, `pagesContent`) + blocks (`tipCallout`, `locationRef`, `imageGallery`, `experienceHighlight`)
- **Workflow**: Draft → In Review → Published → Archived
- **Data Flow**: Sanity CDN for detail/singleton content; Supabase for lists/bookmarks/locations
- **Dual Source**: Guide detail → Sanity first, Supabase fallback
- **Frontend**: `content?.field ?? "hardcoded default"` — site never breaks if Sanity unreachable
- **Caching**: `contentService.ts` uses two-tier cache (globalThis + file) with 4s timeout — prevents Turbopack event-loop blocking from hanging page renders
- **ISR**: `revalidate = 3600` + on-demand webhook
- **Webhook**: `POST /api/sanity/webhook` — guides → Supabase upsert, experiences/singletons → revalidatePath

### Key Directories
| Path | Contents |
|------|----------|
| `src/sanity/schemas/` | Document + singleton + object schemas |
| `src/sanity/` | `client.ts`, `queries.ts`, `structure.ts`, `actions.ts`, `image.ts` |
| `src/lib/sanity/contentService.ts` | Singleton fetcher functions |
| `src/types/sanitySiteContent.ts` | Singleton TS types |
| `src/types/sanityGuide.ts` | SanityGuide, SanityAuthor types |
| `src/types/sanityExperience.ts` | SanityExperience type |
| `src/types/experience.ts` | ExperienceSummary, ExperienceType |
| `src/lib/guides/guideService.ts` | Sanity fetch with try/catch fallback |
| `src/lib/experiences/experienceService.ts` | Experience fetch functions |
| `src/components/features/guides/blocks/` | Portable Text block components |
| `src/components/features/experiences/` | Experience detail components |

### Singletons
- **`landingPage`**: Hero, philosophy stats, showcase acts (3), featured sections headers, testimonials (1-5), final CTA
- **`siteSettings`**: Brand description, newsletter, footer nav, social links
- **`tripBuilderConfig`**: Vibes + regions (readOnly IDs) + step content. Logic-critical fields stay code-side. Regions have `heroImage` + `galleryImages[]` (max 4, used in review step composite).
- **`pagesContent`**: All non-landing page text

---

## Feature Architecture

### Landing Page (`src/components/landing/`)
8 sections: HeroOpening (100dvh, editorial cover, SplitText, Sanity image+hotspot, dual CTAs) → Philosophy (bg-canvas, stats) → ImmersiveShowcase (220vh, 3-act scroll-driven) → FeaturedLocations (180vh horizontal scroll) → FeaturedExperiences (bg-canvas, 3-col grid) → TestimonialTheater (featured quote + card row) → FeaturedGuides (asymmetric grid) → FinalCTA (bg-brand-primary, white button)
- `KokuMark` SVG monogram in menu overlay
- **Mobile**: ImmersiveShowcase → vertical stack below `lg`; FeaturedLocations → snap-scroll strip; Philosophy stats wrap; TestimonialTheater snap-scroll

### Trip Builder (`src/components/features/trip-builder/`)
6 steps: Intro(0) → Dates(1) → EntryPoint(2) → Vibes(3) → Regions(4) → Review(5). Clip-path wipe transitions. `StepProgressTrack` nav. `GeneratingOverlay` loading.
- **Region Step (04)**: Region rows with checkbox indicator (none/partial/full). Click row → toggle all known cities. Hover → detail panel with `RegionCitySelector` (searchable city dropdown). First region panel default-open. `isPanelHovered` ref prevents panel close on input focus.
- **Review Step (05)**: 3-photo composite from selected regions' hero + `galleryImages` (Sanity), padded from other regions. Nav bar fixed `z-50`.
- **Nav buttons**: Fixed to viewport bottom (`z-50`), not sticky. `pb-20` on shell wrapper for content clearance.

### Guide Article (`src/components/features/guides/`)
5 zones: Hero (sticky parallax) → Preamble → Body (editorial rhythm) → Locations (asymmetric grid) → Footer + `GuideProgressBar`.

### Itinerary (`src/components/features/itinerary/`)
- **Desktop**: 50-50 split — timeline left, Mapbox right. **Mobile**: 30vh map peek + timeline below.
- **Guide**: Hybrid composed + template via `src/lib/guide/guideBuilder.ts`
- **Route Optimizer**: Nearest-neighbor via `src/lib/routeOptimizer.ts`, auto-runs on gen
- **Smart Prompts**: `/api/smart-prompts/recommend` — gap detection (`gapDetection.ts`) finds missing meals, light days, timing issues, category imbalance. Click "Add" → preview card with recommendation details → "Add this", "Show another" (max 3), or filter chips (Cheaper, Closer, Indoor, Different cuisine) → confirm inserts activity. Quick meals (konbini) skip preview. `useSmartPromptActions` manages preview state + refinement filters. API accepts `excludeLocationIds` and `refinementFilters` for iterative refinement.
- **Proactive Guidance**: `detectGuidanceGaps()` fetches high-priority (>=7) etiquette/practical tips from `travel_guidance` table, surfaces as sage-colored smart prompt cards with "Got it" dismiss button. Max 2 per day, lowest priority in gap list.
- **Travel Guidance**: `travel_guidance` table, matched by category/city/region/season

### Experiences (`src/components/features/experiences/`)
- `/experiences` grid filtered by type; `/experiences/[slug]` reuses guide layout
- Types: workshop, cruise, tour, experience, adventure, rental
- Sanity-only (56 articles, no Supabase sync), webhook revalidates
- `FeaturedExperiences` queries `featured == true`, fallback to latest

### Explore (`src/components/features/explore/`)
- **Map-driven browse**: Mapbox map as primary nav. Pan/zoom → cards update to show locations in view.
- **Desktop (lg+)**: Cards in normal document flow left, sticky Mapbox map right. Lenis scrolls through cards naturally.
- **Mobile (<lg)**: 30vh map peek (tap to expand 70dvh) + card list below.
- **Fallback**: `CHEAP_MODE=true` or no Mapbox token → editorial grid (`LocationEditorialGrid`), no map.
- **Components**: `ExploreShellLazy` → `ExploreShell` (state/filters, code-split with `dynamic()`) → `ExploreMapLayout` (split layout, bounds filter) → `ExploreMap` (Mapbox GL, GeoJSON clustering) + `ExploreCardPanel` → `ExploreCompactCard`
- **CategoryBar**: Centered search input (with red search icon CTA) + Refine button + Ask Koku button. Lives visually in hero, sticks on scroll (sentinel-based `IntersectionObserver` detects stuck state, adds backdrop).
- **FilterPanel vibes**: Refine panel uses 5 vibe filters (Cultural Heritage, Foodie Paradise, Hidden Gems, Neon & Nightlife, Nature & Adventure) mapped to DB categories via `src/data/vibeFilterMapping.ts`. Hidden Gems uses `is_hidden_gem` boolean column (276 flagged locations). Multi-select OR logic.
- **Data**: Single-request `/api/locations/all` fetches all ~3,839 locations (17-column slim projection incl. `is_hidden_gem`). Two-tier cache (globalThis 30min + file 2hr). `coordinates` included for map.
- **Map layers**: Cluster circles (stepped color by count), individual points (colored by category via `getCategoryHexColor`), name labels at zoom 10+.
- **Lenis**: `data-lenis-prevent` on map container only (scroll-zoom). Cards flow with page scroll.

### Ask Koku (`src/components/features/ask-koku/`)
- **AI Chat**: Conversational assistant powered by Gemini via Vercel AI SDK (`ai` + `@ai-sdk/google`)
- **API**: `POST /api/chat` — streaming chat with tool calls (location search, guidance lookup, trip planning)
- **Tools**: `searchLocations` (Supabase query by category/city/region), `getTravelTips` (guidance service), `buildTripPlan` (structured trip extraction → trip builder)
- **UI**: `AskKokuButton` (floating FAB, hidden on `/studio`, `/explore`; shifted to `bottom-20` on `/trip-builder`) + `AskKokuPanel` (right-slide panel with backdrop)
- **Explore integration**: Outline button in `CategoryBar` → right-slide chat panel in `ExploreMapLayout` (matches `LocationExpanded` pattern: backdrop + `x: "100%"` slide, 480px on desktop, full-screen on mobile)
- **Trip Builder integration**: `buildTripPlan` tool extracts dates/cities/vibes/style from natural language → `AskKokuTripPlanCard` shows confirmation card → "Start Planning" writes to localStorage + navigates to `/trip-builder?step=5` (Review step). On-page updates via `koku:trip-plan-from-chat` custom event. `useTripBuilderNavigation` reads `?step=5` param, sets validity states, cleans URL.
- **Components**: `AskKokuChat` (messages + suggestions + input), `AskKokuMessage` (renders text + trip plan card + location cards), `AskKokuLocationCard`, `AskKokuTripPlanCard`, `AskKokuSuggestions`
- **Key files**: `src/lib/chat/systemPrompt.ts`, `src/lib/chat/tools.ts`, `src/lib/chat/locationSearch.ts`

### Explore → Itinerary
Favorites-only flow: users heart locations on Explore. During trip generation, `TripBuilderClient` passes `favoriteIds` from `AppState.favorites` to `/api/itinerary/plan`. The generator matches favorites to trip cities and injects them as priority activities tagged `"favorite"`. No "Add to trip" button on explore cards.

---

## Data & Quality

### Database
- **Locations**: ~3,839 in Supabase. Coords: `lat`/`lng`. Photos in Supabase Storage. 276 flagged `is_hidden_gem`.
- **Experiences**: 56 in Sanity — separate from locations/explore/itinerary
- **Health Score**: 100/100 (`npm run dq audit|fix|report`)
- **Categories**: restaurant, nature, landmark, culture, shrine, museum, park, temple, shopping, food, entertainment, market, wellness, viewpoint, bar, transport

### Gotchas
- Supabase anon key blocked by RLS on writes — use `SUPABASE_SERVICE_ROLE_KEY`
- Supabase `.select()` default 1000 limit — use `.range()` for full exports
- `tags` column doesn't exist on locations table
- Google API: slim 13-field mask, contact from DB, autocomplete LRU cache, photos from Storage
- API errors: `{ error: "..." }` — read `errorData.error` not `.message`
- `normalizeData()`: enumerate known fields only — never spread raw localStorage
- Zod `.optional()` rejects `null` — use `.nullish().transform(v => v ?? undefined)`

---

## Environment Variables

| Variable | Purpose | Sensitive |
|----------|---------|-----------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID | No |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset | No |
| `SANITY_API_VERSION` | Sanity API version | No |
| `SANITY_API_READ_TOKEN` | Sanity read access | Yes |
| `SANITY_API_WRITE_TOKEN` | Sanity write access | Yes |
| `SANITY_REVALIDATE_SECRET` | Webhook auth | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase read-only key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin (bypasses RLS) | Yes |
| `CHEAP_MODE=true` | Skip Mapbox, use heuristic times | No |
| `ROUTING_PROVIDER` | `"mapbox"` or `"google"` | No |
| `ROUTING_MAPBOX_ACCESS_TOKEN` | Mapbox API token | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key (Ask Koku chat) | Yes |
| `ENABLE_CHAT` | Enable/disable chat (`"false"` to disable) | No |

## Dev Commands

```bash
npm run dev              # Seed cache + dev server (recommended)
npm run dev:fast         # Dev server without cache seed (faster restart)
npm run seed-cache       # Pre-populate file cache from Supabase
npm run dq audit         # Data quality audit
npm run dq fix --dry-run # Preview DQ fixes
npm run dq report        # Health score report
```

### Dev Performance
- `seed-cache` pre-populates `/tmp/koku-travel-cache/` with locations + filter metadata so the first request after restart is instant
- Image optimization is disabled in dev (`unoptimized: true`) to avoid timeout cascades during Turbopack compilation
- Sanity content fetches have a 4s timeout + file cache — prevents 60s+ hangs when Turbopack blocks the event loop
- Middleware skips auth for `/api/locations`, `/api/places`, `/api/health`, `/api/chat` (PUBLIC_API_ROUTES)
