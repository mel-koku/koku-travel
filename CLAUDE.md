# Koku Travel - Development Notes

## Project Overview
Next.js trip planning app for Japan travel — trip builder, itinerary generation, smart prompts for meals/experiences.

---

## Design System

### Typography
- **Display/Headings**: Cormorant — `font-serif` (heroes, page headers, section titles, editorial prose)
- **Body**: Plus Jakarta Sans — `font-sans` (body text, form labels, functional UI)
- **Mono**: Geist Mono — `font-mono` (stats, data, IATA codes, nav numbers)
- **v4 gotcha**: `tailwind.config.js` `fontFamily` is IGNORED -- define in `@theme` block in `globals.css`
- Font imports in `src/app/(main)/layout.tsx` (A) and `src/app/b/layout.tsx` (B), `@theme` in `src/app/globals.css`

#### Typography System (`src/lib/typography-system.ts`)
CVA-based `typography()` function for consistent text styling:
```tsx
import { typography } from "@/lib/typography-system";
<h1 className={typography({ intent: "editorial-hero" })}>Title</h1>
// With overrides (e.g., white text on dark overlay):
<h1 className={cn(typography({ intent: "editorial-h1" }), "text-white")}>Title</h1>
```
- **Editorial intents** (Cormorant): `editorial-hero`, `editorial-h1`, `editorial-h2`, `editorial-h3`, `editorial-prose`, `editorial-quote`
- **Utility intents** (Plus Jakarta Sans): `utility-h1`, `utility-h2`, `utility-body`, `utility-body-muted`, `utility-label`, `utility-tabular`, `utility-meta`
- **All structural headings use `typography()`**. Raw `font-serif` is only for: card titles (need `group-hover`/`line-clamp`), brand/logo text, decorative elements, loading placeholders.
- **Dark overlay headings**: use `cn(typography({ intent }), "text-white")` to override the default `text-foreground`

#### Text Balance (widows/orphans)
- Global `text-wrap: balance` on all `h1`, `h2`, `h3` in `globals.css`
- Typography system editorial heading intents and `editorial-quote` include `text-balance`
- Do not add `text-balance` to body prose or long-form text -- it only helps short blocks like headings and pull quotes

#### Utility Classes
- **`.eyebrow-editorial`**: `text-[11px] font-medium uppercase tracking-[0.2em] text-foreground-secondary`
- **`.eyebrow-mono`**: `font-mono text-xs uppercase tracking-wide text-foreground-secondary`
- **`.serif-body`**: `font-serif` (guide prose)

### Design Tokens (Warm Editorial light palette)
| Purpose | Class | Hex |
|---------|-------|-----|
| Page bg (Washi) | `bg-background` | `#FAF8F5` |
| Canvas (tonal lift) | `bg-canvas` | `#F5F2EE` |
| Card surface / Cream | `bg-surface` / `bg-cream` | `#F5F2EE` |
| Borders / Sand (Shouji) | `border-border` / `bg-sand` | `#E5E0D8` |
| Primary text | `text-foreground` | `#2C2825` |
| Body text (articles) | `text-foreground-body` | `foreground @ 85%` |
| Secondary / Warm gray | `text-foreground-secondary` / `text-warm-gray` | `#6B6058` |
| Labels/captions | `text-stone` | `#8A7F72` |
| Brand CTA (Vermilion) | `bg-brand-primary` | `#E23828` |
| Brand secondary (Deep Vermilion) | `bg-brand-secondary` | `#C93022` |
| Success / Matcha | `bg-sage` / `bg-success` / `text-success` | `#4A6B53` |
| Warning / Yuzu | `text-warning` | `#D99B29` |
| Error / Nasu | `bg-error` / `text-error` | `#593A40` |
| Charcoal (overlays) | `bg-charcoal` | `#2C2825` |
| Ai Blue (transit/tech) | `bg-accent` / `text-accent` | `#2F455C` |

**Semantic tint tokens**: `--matcha-tint` (`#EDF2EE`), `--yuzu-tint` (`#FDF8F0`), `--nasu-tint` (`#F4EAEB`), `--ai-tint` (`#EBF0F5`)

- **Tonal rhythm**: Alternate `bg-background`/`bg-canvas` -- no explicit dividers. `bg-canvas` on: Philosophy, FeaturedExperiences, GuidePreamble.

### Color Rules
- **Never** use raw Tailwind colors (`gray-*`, `indigo-*`, `amber-*`). Exception: `TravelModeSelector.tsx` transport-mode colors.
- Use short-form tokens (`text-charcoal`, `bg-surface`) not namespaced prefixes
- Overlays: `bg-charcoal/` not `bg-black/`; `bg-white` only on overlays against dark images/maps. Section overlays: `bg-charcoal/60`. Body text on dark: `text-white/80`, meta: `text-white/70`.
- **Image scrims**: Use eased `.scrim-{opacity}` utilities (`scrim-20` through `scrim-90`) instead of `bg-gradient-to-t from-charcoal/XX`. 8-stop ease-out curve in oklab for smooth perceptual fade. Direction override: `.scrim-to-l`, `.scrim-to-b`. Defined in `globals.css`. Never use raw `bg-gradient-to-t from-charcoal/` for image overlays.
- Gradients (non-scrim): `from-charcoal/` not `from-[#1f1a14]/`
- Border radius: `rounded-lg` (8px) for cards/containers, `rounded-md` (6px) for inputs/badges/small elements
- `brand-primary` for: CTA buttons, focus rings, progress bars, card hover text, decorative accents, hover underlines
- Activity categories have distinct cool colors — see `src/lib/itinerary/activityColors.ts`

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
| **Listing pages** | `px-4 sm:px-6 lg:px-8` | Explore, guides, dashboard, account, Container.tsx |
| **Editorial** | `px-6` (flat) | Landing sections, article body, footer |
| **Hero content** | `px-6 sm:px-8 lg:px-12` | Guide/experience hero overlays |

### Mobile Responsiveness
- `h-[100dvh]` not `h-screen` (mobile address bar fix)
- Touch targets min 44px — `h-11 w-11` icons, `h-12` inputs
- `text-base` on all inputs (prevents iOS auto-zoom)
- `active:scale-[0.98]` on CTAs
- Safe areas: `pt-[env(safe-area-inset-top)]` header, `pb-[env(safe-area-inset-bottom)]` fixed-bottom
- `overscroll-contain` on horizontal scroll containers
- `snap-x snap-mandatory` + `snap-start` for carousels

### Motion System (`src/lib/motion.ts`)
- **Curves**: `easeReveal`, `easeCinematic`, `easePageTransition`, `easeScrollIndicator`, `easeEditorial` -- see file for values
- **easeEditorial** `[0.22, 1, 0.36, 1]`: Smooth deliberate transitions (warm editorial default)
- **Gotcha**: `as const` tuples need `[...easeReveal] as [number, number, number, number]` in Variants context
- **Gotcha**: `tailwind.config.js` `letterSpacing` IGNORED in v4 -- define `--tracking-*` in `@theme`
- **Durations**: `durationBase` = 0.4s, `durationSlow` = 0.5s (tightened from 0.6/0.8)
- **SplitText**: Arrival moments only -- max ~2 per page
- **ScrollReveal**: Direction-based reveal via `src/components/ui/ScrollReveal.tsx`. Defaults: distance 20px, duration 0.5s, easing easeReveal. Never override distance or duration -- only direction and delay. Stagger: 0.08s per grid item.
- **Style guide**: Full Variant A reference at `docs/VARIANT_A_STYLE_GUIDE.md`
- **Card Hover**: Image `group-hover:scale-[1.04]` + title `group-hover:text-brand-primary` + optional `hover:-translate-y-1`

### Shadows (Variant A)
- Tokens: `--shadow-sm`, `--shadow-card`, `--shadow-elevated`, `--shadow-glow` (earth-tinted rgba, Vermilion glow) in `:root`
- Cards: `shadow-[var(--shadow-card)]` default, `shadow-[var(--shadow-elevated)]` on hover
- Never use bare Tailwind `shadow-sm`/`shadow-xl` on Variant A -- always use `shadow-[var(--shadow-*)]` token shadows

### Signature CTA (`.btn-koku`)
- Vermilion glow on hover (`--shadow-glow`) + light sweep pseudo-element animation
- Applied to: hero CTAs, FinalCTA, Button component `default`/`primary` variants
- CSS in `globals.css` after `.link-reveal`

### Copy Voice
- **Say less** — cut filler, hedging, inflated verbs
- **Trust the UI** — don't restate what's visible
- **Talk to the person** — "We'll route from there" not "helps us plan smarter routes"
- **Be concrete** — "Mix of sightseeing and downtime" not "A bit of everything"
- **Neutral empty states** — "Not set" not "None yet"
- **Plain errors** — periods, no hedging, say what to do
- **Ownership CTAs** — "Build My Itinerary" not "Generate Itinerary"
- **No em dashes** — never use `—` in user-facing text, commits, comments, or docs
- **No gatekeeping language** — never "places locals keep to themselves", "secrets", "hidden from tourists". Position through depth and care, not exclusive access

---

## A/B Variant System

### Architecture
- **URL prefix**: `/b/` for Variant B. No prefix = Variant A.
- **Route groups**: A pages in `src/app/(main)/`, B pages in `src/app/b/`, shared routes (api, studio, auth, shared) at root.
- **Fallback**: `src/app/b/[...fallback]/page.tsx` redirects unbuilt pages to A automatically.
- **Root layout**: Minimal shell (`html`, `body`, CSS). Variant-specific layout in `(main)/layout.tsx` (A), `b/layout.tsx` (B).
- **CSS scoping**: `[data-variant="a"]`, `[data-variant="b"]` blocks in `globals.css`. `@theme inline` resolves per-variant via `var()`.
- **Shared providers**: `SharedProviders.tsx` (QueryProvider, AppState, Toast, Saved) reused by both. A adds ThemeProvider + CursorProvider; B does not.
- **VariantContext**: `useVariant()` returns `{ variant, basePath }`. `useVariantHref(path)` prefixes `/b/` for variant components.
- **Path aliases**: `@b/*` → `src/components-b/*` (tsconfig).
- **VariantToggle**: Cycles A → B → A. Dev-only or `NEXT_PUBLIC_SHOW_VARIANT_TOGGLE`.

### Variant A (Warm Editorial)
Light warm editorial -- Cormorant + Plus Jakarta Sans + Geist Mono, Vermilion `#E23828`, Washi `#FAF8F5` bg, parallax/SplitText/Lenis. All structural headings use `typography()` CVA system. See Design System section above.

### Variant B ("Logical Elegance")
Light soft minimalism — Inter only, Ai-iro navy `#2D4B8E`, spring hovers, animated counters, Lenis. No custom cursor, no parallax, no SplitText, no ScrollReveal.

**Full style guide**: `src/components-b/STYLE_GUIDE.md`

| Aspect | Variant A | Variant B |
|--------|-----------|-----------|
| Background | `#FAF8F5` (Washi warm white) | `#F8F7F4` (Kinari warm neutral) |
| Text | `#2C2825` (warm charcoal) | `#1A1D21` (charcoal) |
| Accent | `#E23828` (Vermilion) | `#2D4B8E` (Ai-iro navy) |
| Fonts | Cormorant + Plus Jakarta Sans + Geist Mono | Inter only |
| Headings | Serif semibold (Cormorant) via `typography()` | Sans-serif bold |
| Radius | 8px | 16px |
| Shadows | Earth-tinted warm, Vermilion glow | Layered organic |
| Motion | SplitText, parallax, Lenis, easeEditorial | Lenis, spring micro-interactions, fade-ups |
| Cards | White, warm borders, earth shadows | White, shadow-card, borderless |
| Layout | Centered `max-w-7xl` | Centered `max-w-7xl` |

### Building B Pages
1. Create `src/app/b/<route>/page.tsx` — catch-all redirect stops automatically
2. Components go in `src/components-b/` (import via `@b/*`)
3. Same data sources (Sanity, Supabase) — only presentation changes
4. Use `var(--token)` for colors, never raw hex in components
5. Follow B motion patterns: `y: 8-12`, spring hovers, `bEase` tuple
6. Test both `/<route>` and `/b/<route>` — A must be unchanged
7. Shadows: always `shadow-[var(--shadow-sm)]` etc., never bare Tailwind `shadow-sm`/`shadow-lg`
8. Image scrims: use `.scrim-{opacity}` utilities (e.g., `scrim-60`), never raw `bg-gradient-to-t from-charcoal/`. Other overlays: `bg-charcoal/`, never `bg-black/`
9. Buttons: min `h-11` (44px), `active:scale-[0.98]` on all CTAs
10. Eyebrows: page-level `tracking-[0.2em] text-[var(--primary)]`, dense/inline `tracking-[0.15em] text-[var(--muted-foreground)]`
11. Tints: `color-mix(in srgb, var(--token) N%, transparent)` — never hardcode rgba equivalents
12. Mapbox paint hex values are acceptable (JS API can't reference CSS vars) — match token values
13. Radius: `rounded-3xl` hero/CTA, `rounded-2xl` cards, `rounded-xl` buttons/inputs, `rounded-lg` small inline elements

### B Header (`src/components-b/HeaderB.tsx`)
- **User menu**: Auth-aware avatar button (desktop dropdown, mobile inline in hamburger menu). Uses `useAuthState` + `useAppState`. Shows user initial when signed in, person silhouette when signed out.
- **Desktop dropdown**: Dashboard, Saved Places, Account (auth-only), Sign In / Sign Out. Click-outside close via `mousedown` listener.
- **Mobile**: User items appended below nav links with divider — same auth-aware item set.

### B Itinerary (`src/components-b/features/itinerary/`)
Fully self-contained — no A component imports.
- **Shell** (`ItineraryShellB`): Day tabs, TripConfidenceDashboardB toggle, SmartPromptsDrawerB, ShareButtonB, ActivityReplacementPickerB
- **Timeline** (`ItineraryTimelineB`): DnD reorder, travel segments, guide cards, all day-level features
- **Day header**: Date/city label, DayStartTimePickerB, DayRefinementButtonsB (Adjust dropdown), AccommodationPickerB (Mapbox search for start/end locations)
- **Activity cards**: PlaceActivityRowB (ConflictBadgeB inline, ActivityTipB badges), NoteActivityRowB
- **Day-level features**: WhatsNextCardB (today detection), TodayIndicatorB, DayTipsB (travel guidance accordion), DayConflictSummaryB, AvailabilityAlertB (operating hours check via `useDayAvailability` hook)
- **Travel**: TravelSegmentB + TravelModeSelectorB (mode dropdown with parallel route estimates), AccommodationBookendB (display-only). End location falls back to start location when not explicitly set (mirrors map behavior).
- **Modals/panels**: SmartPromptsDrawerB, AccommodationPickerB, RunningLatePopoverB
- **Dashboard**: TripConfidenceDashboardB (health score, checklist, per-day RouteOverviewB, export)
- **Smart prompts**: SmartPromptCardB — guidance tips show "Got it" dismiss, meal/experience gaps show "Add/Skip"
- **Auto-replan**: Setting accommodation triggers `useItineraryPlanning` replan (accommodation fingerprint watch), recalculates all travel times and schedules
- **Style**: No left accent borders on cards — clean `shadow-card` only

### B Places Page (`src/components-b/features/places/`)
- **Grid/Map toggle**: Single-row category bar with inline count, search, view toggle, refine button. View mode synced to `?view=map` URL param so back-navigation restores it.
- **Grid mode**: Intro hero + seasonal banner + infinite-scroll card grid. Save pill on cards (icon + "Save for trip" text, persists when saved)
- **Map mode**: Full-viewport `fixed` Mapbox map below header + category bar (`top: calc(var(--header-h) + 52px)`). `data-lenis-prevent` on container. Mercator projection. Floating vertical pill column on left side (`w-56`, individual `bg-white` pills, no panel background) with bounds-filtered locations, infinite scroll, and two-way hover sync (card↔pin). Intro/seasonal banner hidden. Category bar solid white always on (z-40 above map z-20). Card click flies map to location (zoom 14). Count pill shows "Zoom out for more" when ≤10 locations in viewport.
- **Map pill card** (`PlacesMapCardB.tsx`): Compact pill — 32×32 thumbnail, name, city + rating on second line. `forwardRef` for auto-scroll on map pin hover. Click sets `flyToLocation` + opens detail panel.
- **Map stability**: `PlacesMapB` uses callback refs (`onLocationClickRef`, `onHoverChangeRef`, `onBoundsChangeRef`) so the Mapbox instance doesn't reinitialize when parent re-renders (e.g., closing detail panel changes `searchParams` → new callback references).
- **Detail page**: Full-page layout at `/b/places/[id]` — hero, sticky back bar, metadata, save button, photo gallery, content sections, nearby grid. "Back to all places" uses `router.back()` to preserve view mode.
- **Save button pattern**: Unified across card + detail — white pill unsaved, `--primary` pill saved, whole button clickable with heart icon + label

---

## Sanity CMS

- **Studio**: `/studio` via `next-sanity`. Schemas in `src/sanity/schemas/`.
- **Schemas**: `guide` (includes blog via `guideType: "blog"`) + `experience` + `author` + 4 singletons (`landingPage`, `siteSettings`, `tripBuilderConfig`, `pagesContent`)
- **Data Flow**: Sanity CDN for detail/singleton content; Supabase for lists/bookmarks/locations
- **Frontend**: `content?.field ?? "hardcoded default"` — site never breaks if Sanity unreachable
- **Caching**: `contentService.ts` uses two-tier cache (globalThis + file) with 4s timeout. Dev mode skips all caches for instant Sanity content updates
- **ISR**: `revalidate = 3600` + on-demand webhook at `POST /api/sanity/webhook`
- **Singletons**: `landingPage` (hero, stats, showcase, testimonials, CTA), `siteSettings` (brand, footer, social), `tripBuilderConfig` (vibes, regions, step content), `pagesContent` (all non-landing text)

---

## Feature Architecture

### Landing Page (`src/components/landing/`)
9 sections: HeroOpening → Philosophy → ImmersiveShowcase (scroll-driven, 3-act) → FeaturedLocations → SeasonalSpotlight → FeaturedExperiences → TestimonialTheater → FeaturedGuides → AskKokuPreview → FinalCTA

### Trip Builder (`src/components/features/trip-builder/`)
6 steps: Intro(0) → Dates(1) → EntryPoint(2) → Vibes(3) → Regions(4) → Review(5). Clip-path wipe transitions. Step labels: Intro, Dates, Entry Point, Vibes, Regions, Review. Both A (`StepShell`) and B (`StepNavBarB`) support `disabledHint` prop — shown when user taps a disabled Continue button (validation feedback). Mobile buttons use click handler instead of `disabled` HTML attr (prevents swallowed taps).
- Region Step: rows toggle all cities, hover → detail panel with searchable city dropdown
- Review Step: 3-photo composite from selected regions' Sanity images
- **Auto Return Day**: `optimizeCitySequence()` auto-appends the airport city (1 day) when the last optimized city is >2h from the departure airport. Only runs for non-custom order — custom order still shows the warning + action button. The existing `detectReturnToAirportWarning()` naturally suppresses when the airport city is already last.
- **Duplicate Cities**: Users can duplicate a city in the route order (e.g., Tokyo → Osaka → Tokyo). Copy icon on each city row inserts a duplicate below, stealing 1 day from source (disabled at 1 day). `cityDays` is a parallel `number[]` array where `cityDays[i]` = days for `cities[i]`. Old `Record<CityId, number>` format auto-migrates on load. `SortableCityList` uses composite dnd-kit IDs (`${cityId}-${index}`) for uniqueness. `sanitizeCities()` allows duplicates; `resolveCitySequence()` allows them when `customCityOrder` is set.

### Itinerary (`src/components/features/itinerary/`)
- **Layout**: Desktop 50-50 split (timeline + Mapbox). Mobile 30vh map peek + timeline.
- **Guide**: LLM-generated prose (Pass 3) → template fallback via `src/lib/guide/guideBuilder.ts`. See "Hybrid LLM Layer" below.
- **Accommodation**: `AccommodationBookend` at day start/end. 3-tier priority: per-day → city → fallback.
- **Smart Prompts**: Gap detection finds light days, timing issues, transport optimizations. Suggestions are opt-in via trip score badge (X/100) next to day selector. Clicking the badge toggles suggestion visibility. Meal suggestions excluded from drawer (handled by day-level suggestions).
- **Conflict Summary Banner**: Dismissible banner at itinerary open showing total scheduling notes with per-day jump buttons. `ConflictSummaryBanner` in `ItineraryShell.tsx`.
- **Generation Success Moment**: After itinerary builds, `GeneratingOverlay` shows a 2.5s celebration screen (animated checkmark + trip name) before navigating to the itinerary page.
- **Proactive Guidance**: `travel_guidance` tips surfaced as sage smart prompt cards
- **Month Filtering**: `valid_months int[]` column on `travel_guidance` gives month-level precision beyond 4-season buckets. `guidanceService.ts` checks `validMonths` before `seasons` (score +6 vs +4). All callers pass `month` derived from trip start date.
- **Transit Directions**: `TravelSegment` / `TravelSegmentB` show expandable step-by-step transit directions (line name, departure/arrival stations, num stops) when `transitSteps` data exists on travel segments. Collapsed = compact pill; expanded = vertical step list with walk/transit icons.
- **Getting There**: Activity cards (`PlaceActivityRow` / `PlaceActivityRowB`) show nearest station + Japanese name from location data when available.
- **Smart Pro Tips**: `DayTips` / `DayTipsB` compute context-aware tips from day travel data -- IC card (Day 1), city transitions, heavy transit days, rush hour warnings, long train rides.
- **Day Trip Suggestions**: Proactively surfaces high-quality locations 50-150km from planned cities as opt-in day trip ideas. These are locations outside normal itinerary scheduling range (which applies -100 penalty at >50km) that are worth a dedicated day.
  - **Suggest API** (`POST /api/day-trips/suggest`): Queries locations by bounding box, filters to 50-150km from user cities, scores by vibe match + rating + UNESCO/hidden gem badges. Returns max 3 per city, 12 total. Distance-based travel time estimates.
  - **Plan API** (`POST /api/day-trips/plan`): Fetches anchor location + 2 nearby companions, builds 2-3 activity day with real routed travel times (Google Directions transit mode, heuristic fallback). Attaches `travelFromPrevious` on first activity and `travelToNext` on last.
  - **Hook** (`useDayTripSuggestions`): Fetches once on mount when a city has 3+ days. Caches by city+vibe key.
  - **DayTripBanner**: Sage dismissible banner on the timeline ("5 day trip ideas near your route") with per-city counts and "View all" button to dashboard. `data-day-trip-banner` attribute for scroll targeting.
  - **DayTripSection**: Card list in TripConfidenceDashboard with day picker dropdown and inline confirmation. "Swap Day" action replaces a user-chosen day's activities.
  - **DayTripNudge**: One-time floating toast after itinerary generation (triggered by `?new=1` URL param from trip builder). Auto-dismisses after 8s or scrolls to banner on click.
  - **Undo**: Day swaps go through `updateDayActivities` in edit history (`swapDayTrip` edit type), so Cmd+Z restores the original day.
  - **ItineraryDay fields**: `isDayTrip`, `baseCityId`, `dayTripTravelMinutes` on swapped days.
  - B variant components not yet built (fallback redirect handles it).

### Explore (`src/components/features/explore/`)
- Map-driven browse with Mapbox. Desktop: cards left + sticky map right. Mobile: 30vh map peek.
- `CategoryBar`: Unified search + video link import. Sticks on scroll.
- `LocationExpanded`: Slide-in detail panel (backdrop + `x: "100%"` slide, 480px desktop, full-screen mobile)
- Deep-link: `/explore?location={id}` auto-opens panel + flies map

### Places (`src/components/features/places/`)
- **Listing**: `/places` — category-filtered grid browse of all locations
- **Detail page**: `/places/[id]` — server-rendered with ISR (`revalidate = 3600`). `generateMetadata` for SEO/OG. `PlaceDetail` client component with: hero image, sticky back bar, title/metadata, save button, photo gallery (up to 5), description, artisan/guide profiles, local tips, practical info (station, payment, reservations, dietary, meals, service), accessibility badges, good-for pills, Google reviews, address, opening hours, external links, nearby locations grid.
- **Data**: Server fetches core fields from Supabase; client-side `useLocationDetailsQuery` enriches with Google Places details (photos, reviews, hours, address).

### Ask Koku (`src/components/features/ask-koku/`)
Gemini-powered chat via Vercel AI SDK. Tools: `searchLocations`, `getTravelTips`, `buildTripPlan`. Floating FAB + right-slide panel.

### Share Itinerary
`/shared/{token}` — read-only itinerary via 128-bit base64url token. Owner manages via `ShareButton` (create/copy/disable). `isReadOnly` prop threads through all itinerary components.

### Explore → Itinerary
Favorites-only flow: heart locations on Explore → generator injects as priority activities tagged `"favorite"`.

---

## Client State & Sync

### AppState (`src/state/AppState.tsx`)
Global React Context — `user`, `favorites`, `guideBookmarks`, `trips`, edit history + all actions.
- Persists to localStorage (debounced). Auth sync via `onAuthStateChange` → `refreshFromSupabase()`.
- Trip mutations debounced 2s. `beforeunload` + `visibilitychange` flush pending syncs.
- Undo/redo: Snapshot-based per trip (`src/state/useEditHistory.ts`). Cmd+Z / Cmd+Shift+Z. Edit types: `replaceActivity`, `deleteActivity`, `reorderActivities`, `addActivity`, `swapDayTrip`, `setDayEntryPoint`.
- Sync layer in `src/services/sync/` — optimistic favorites/bookmarks, timestamp-based trip merge.

---

## Hybrid LLM Layer (`src/lib/server/`)

Three Gemini passes wrap the existing algorithmic pipeline. All gracefully degrade — if Gemini fails, output is identical to pure-algorithmic.

```
Builder data ──┬─→ [Pass 1: Intent Extract] ─→ constraints
               │                                   ↓
               └─→ [Fetch Locations] ────────→ [Score & Pick + constraints]
                                                   ↓
                                              [Route & Schedule] ─┬─→ [Pass 2: Refine Days]
                                                                  └─→ [Pass 3: Guide Prose]
                                                                          ↓
                                                                       Trip + Guide
```

### Pass 1: Intent Extraction (`intentExtractor.ts`)
- **Input**: All builder data (notes, vibes, group, pace, accessibility, dates, cities)
- **Output**: `IntentExtractionResult` — pinned locations, excluded categories, category weights (0.5-2.0), pacing hint, day constraints, time preference
- **Latency**: 0s added (parallel with location fetch, 5s timeout)
- **Integration**: Pinned locations injected before scoring loop. Excluded categories filter in `availableLocations`. Category weights multiply interest match score. Pacing hint scales time slot capacity.

### Pass 2: Day Refinement (`dayRefinement.ts`)
- **Input**: Full planned itinerary with scheduled times, travel segments, runner-ups
- **Output**: `DayRefinementResult` — swap/reorder/flag patches, quality score
- **Latency**: ~1.5-2s added (sequential after planning, 8s timeout)
- **Patch types**: `swap` (replace activity with runner-up), `reorder` (change activity sequence), `flag` (add warning to notes). Invalid patches silently skipped.

### Pass 3: Guide Prose (`guideProseGenerator.ts`)
- **Input**: Optimized itinerary, builder data, intent extraction insights
- **Output**: `GeneratedGuide` — trip overview, per-day intro/transitions/cultural moment/practical tip/summary
- **Latency**: 0s added (parallel with `planItinerary()`)
- **Fallback chain**: Guide prose → standalone `generateDayIntros()` → template system (`buildGuide()`)
- **Guide builder**: `guideBuilder.ts` accepts optional `guideProse` 4th param. When present, merges generated prose with template fallback for missing segments.

### Types & Schemas
- **Types**: `src/types/llmConstraints.ts` — `IntentExtractionResult`, `DayRefinementResult`, `RefinementPatch`, `GeneratedGuide`
- **Schemas**: `src/lib/server/llmSchemas.ts` — Zod schemas for `generateObject()`. Guide prose schema built dynamically from day IDs.
- **API**: `POST /api/itinerary/plan` returns `guideProse` alongside `dayIntros`
- **Client**: `useItineraryGuide` accepts optional `guideProse` and passes to `buildGuide()`
- **Cache**: `itineraryCache.ts` includes `accessibility.notes` in cache key normalization

---

## Scoring & Intelligence

### Location Scoring (`src/lib/scoring/locationScoring.ts`)
11-factor system: interest match (30), rating (25), logistical fit (-100 to 20, **hard -100 for >50km**), budget (10), accessibility (10), diversity (-5 to +5), neighborhood diversity (-5 to +5), weather (-10 to +10), time-of-day (-5 to +10), group fit (-8 to +8), dietary fit (-5 to +5, food categories only, uses `servesVegetarianFood`). Optional LLM-derived `categoryWeights` multiplier on interest match score.

- **Contextual Distance Threshold**: The 50km hard cutoff extends to 75km when ALL of: (`nature_adventure` or `local_secrets` vibe) + `relaxed` pace + nature-ish category (nature, park, beach, viewpoint, onsen, craft). The 50-75km band scores at -25 (steep penalty, survives `>= -50` post-filter but loses to closer alternatives).
- **Hidden Gem Rating Floor**: `isHiddenGem + null rating` scores 15/20 (4.0-star equivalent) instead of neutral 10/20. Editorial curation overrides Google data gaps.
- **Hidden Gem Scoring**: Two layers: unconditional +5 for `local_secrets` vibe + conditional +8 for 2+ tag matches. Max combined: +13.
- **Diversity**: Max 2 consecutive same-category or same-neighborhood activities
- **Weather**: OpenWeatherMap 5-day forecast, all 17 cities. Outdoor penalized in rain.
- **Preference Learning**: localStorage-based. favorite +2, unfavorite -0.5, replace -1, skip -0.5.
- **Trip Warnings**: Pacing, distance, holidays, seasonal (cherry blossom, rainy season, etc.)
- **Conflict Detection**: Operating hours, travel time, overlaps, reservation recommendations
- **Refinement**: 7 types via `POST /api/itinerary/refine` (too_busy, too_light, more_food, more_culture, more_kid_friendly, more_rest, more_craft)

---

## Infrastructure

### Auth (Supabase)
- Middleware (`src/middleware.ts`): Default-protect all `/api/` routes unless in `PUBLIC_API_ROUTES`. Auth routes redirect to `/dashboard`. Variant-aware redirects (`/b/dashboard`).
- Client: `src/lib/supabase/client.ts` (browser), `server.ts` (server components)
- Sign-in: `/signin` page (not `/auth/login`)
- **Sign-out**: All three sign-out paths (Header UserMenu, MenuNav, AccountSection) must call `clearAllLocalData()` after `supabase.auth.signOut()`. Keep in sync.
- **Dashboard guest prompt**: Unauthenticated users see a sign-in banner below the page header. Dashboard is accessible to guests but data is local-only.
- **Dashboard empty state**: When no trips exist, shows atmospheric card with "Build My First Trip" CTA + 3 value props (timeline, routes, sharing).

### Key Patterns
- **Rate Limiting**: Upstash Redis (prod) → in-memory (dev). Config in `src/lib/api/rateLimit.ts`.
- **Itinerary Cache**: 24h Redis, SHA-256 key of normalized builder data
- **Routing**: Multi-provider (Mapbox → Google → heuristic). 5s timeout + fallback. Config via `ROUTING_PROVIDER` env. Transit mode prefers Google (Mapbox lacks transit support). Falls back to `GOOGLE_PLACES_API_KEY` if no dedicated routing key is set. Structured transit steps (`TransitStep[]`) preserved through the pipeline when Google Directions returns transit_details.
- **Cost Control**: Google Places max 50 calls/trip. `CHEAP_MODE` disables external APIs.
- **API Handler**: `withApiHandler.ts` wraps routes with rate limit + auth + validation + error handling
- **File Cache**: Synchronous fs-based at `/tmp/koku-travel-cache/` (Turbopack event-loop workaround)
- **Env Validation**: `src/lib/env.ts` — throws if Supabase vars missing in production

### Gotchas
- Supabase anon key blocked by RLS on writes — use `SUPABASE_SERVICE_ROLE_KEY`
- Supabase `.select()` default 1000 limit — use `.range()` for full exports
- `tags text[]` has GIN index; `cuisine_type text` for food categories
- Google API: slim 13-field mask, photos from Supabase Storage, autocomplete LRU cache
- API errors: `{ error: "..." }` — read `errorData.error` not `.message`
- `normalizeData()`: enumerate known fields only — never spread raw localStorage
- Zod `.optional()` rejects `null` — use `.nullish().transform(v => v ?? undefined)`

---

## Data

- **Locations**: 6,283 active in Supabase. `is_hidden_gem` (1,012), `jta_approved`, `is_unesco_site` (216 locations across 26 UNESCO designations covering all 25 Japanese World Heritage Sites), `is_active` flags. All have `tags[]`, food locations have `cuisine_type`. UNESCO locations also have `unesco_serial_name` (official inscription name), `unesco_year`, `unesco_type` (cultural/natural) metadata. All location list/search queries filter `.eq("is_active", true)`; single-item ID lookups (detail, saved, validation) are exempt.
- **Google Places fields**: `place_id`, `rating`, `review_count`, `operating_hours`, `primary_photo_url`, `google_maps_uri`, `website_uri`, `phone_number`, `google_primary_type`, `google_types`, `business_status`, `price_level`, `editorial_summary`, `accessibility_options`, `good_for_children`, `good_for_groups`, `outdoor_seating`, `reservable`, `dietary_options`, `service_options`, `meal_options`
- **Gemini-enriched fields**: `name_japanese`, `nearest_station`, `cash_only`, `reservation_info`, `insider_tip`, `tags` (9-dimension)
- **Categories**: restaurant, nature, landmark, culture, shrine, museum, park, temple, shopping, garden, onsen, entertainment, market, wellness, viewpoint, bar, aquarium, beach, cafe, castle, historic_site, theater, zoo, craft
- **Vibes** (11): temples_tradition, foodie_paradise, nature_adventure, zen_wellness, neon_nightlife, pop_culture, local_secrets, family_fun, history_buff, artisan_craft, in_season — defined in `src/data/vibes.ts`, filter mapping in `src/data/vibeFilterMapping.ts`
- **Tag Dimensions** (9): env (indoor/outdoor/mixed), pace (quick-stop/half-day/full-day), seasonal, atmo (quiet/lively/contemplative/neutral), tourist (iconic/popular/local-favorite/hidden), time (morning/afternoon/sunset/evening/late-night/anytime), exp (scenic/hands-on/tasting/learning/spiritual/adrenaline/relaxation/photo-op), for (solo/couples/families/groups), char (traditional-japan/modern-japan/quirky-japan/zen-japan/pop-culture)
- **Experiences**: 56 in Sanity (separate from locations/itinerary)
- **Guides**: ~90 in Sanity
- **DQ Health**: 0 critical, 0 high, 320 medium (`npm run dq audit|fix|report`). Remaining mediums are mostly MISSING_OPERATING_HOURS (221) and HIDDEN_GEM_MISSING_RATING (89), both awaiting Google Places enrichment pass. Duplicate rules include `DUPLICATE_PLACE_ID` and `DUPLICATE_JAPANESE_NAME` detection. PLANNING_CITY_COORD_MISMATCH 50-150km locations downgraded to low (surfaced via day trip suggestions). Enrichment script `scripts/enrich-locations.js` ready to fill gaps.

---

## Dev Commands

```bash
npm run dev              # Seed cache + dev server (recommended)
npm run dev:fast         # Dev server without cache seed
npm run dev:debug        # Dev server with exit monitor (diagnose crashes)
npm run seed-cache       # Pre-populate file cache from Supabase
npm run dq audit         # Data quality audit
```

- `seed-cache` pre-populates `/tmp/koku-travel-cache/` so first request is instant. Must mirror the same filters as the API route (e.g., `is_active = true`) or deactivated locations leak into dev.
- Image optimization disabled in dev (avoids Turbopack timeout cascades)
- Sanity fetches have 4s timeout + file cache (prevents Turbopack event-loop hangs)
