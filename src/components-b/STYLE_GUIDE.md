# Variant B — Style Guide

> Reference for building all /b/\* pages. Aesthetic: "Logical Elegance" / Soft Minimalism.

---

## Identity

- **Light, monochromatic, airy** — white cards on soft gray, generous whitespace
- **Single accent**: Ai-iro (Japanese indigo navy) `#2D4B8E` — used sparingly on CTAs, links, focus rings, eyebrow labels
- **No texture, no grain, no editorial serif** — clean, modern, trustworthy
- **Motion = subtle + purposeful** — spring hovers, soft fade-ups, animated counters. Never flashy.

---

## Typography

**Single font**: Inter (variable weight via `next/font/google`)

### Type Scale

| Level          | Role                             | Desktop | Mobile | Weight         | Class                            |
| -------------- | -------------------------------- | ------- | ------ | -------------- | -------------------------------- |
| **Display**    | Landing hero, trip builder intro | 72px    | 36px   | bold (700)     | `clamp(2.25rem, 5vw, 4.5rem)`    |
| **Page title** | Inner page h1 (places, detail)   | 44px    | 28px   | semibold (600) | `clamp(1.75rem, 3.5vw, 2.75rem)` |
| **Section**    | Landing h2s, step headings       | 30px    | 24px   | semibold (600) | `text-2xl sm:text-3xl`           |
| **Subsection** | Showcase act h3, sub-headings    | 20px    | 18px   | semibold (600) | `text-lg sm:text-xl`             |
| Body lg        | Hero subtitle, lead text         | 18px    | 18px   | regular (400)  | `text-lg`                        |
| Body           | Paragraphs                       | 16px    | 16px   | regular (400)  | default                          |
| Small          | Labels, buttons, card titles     | 14px    | 14px   | medium (500)   | `text-sm`                        |
| Caption        | Eyebrows, metadata               | 12px    | 12px   | semibold (600) | `text-xs`                        |

### Weight & Role Reference

| Role                   | Weight         | Color                        | Tracking          | Example                    |
| ---------------------- | -------------- | ---------------------------- | ----------------- | -------------------------- |
| Display / Page headers | 700 (bold)     | `--foreground` #1C1A17       | `-0.04em`         | Hero headline              |
| Section titles         | 600 (semibold) | `--foreground` #1C1A17       | `-0.02em`         | "Places worth the journey" |
| Eyebrow labels         | 600 (semibold) | `--primary` #2D4B8E          | `0.2em` uppercase | "FEATURED PLACES"          |
| Body text              | 400 (regular)  | `--foreground-body` #504D48  | `0`               | Descriptions, paragraphs   |
| Secondary / Captions   | 400 (regular)  | `--muted-foreground` #78736C | `0`               | Metadata, timestamps       |
| Labels / Buttons       | 500 (medium)   | varies                       | `0`               | Button text, nav items     |
| Small labels           | 600 (semibold) | `--muted-foreground`         | `0.2em` uppercase | Footer column headers      |

### Font Loading

```tsx
// In src/app/b/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
```

Applied via inline `style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}` on the `data-variant="b"` div (overrides body's DM Sans).

### Eyebrow Variants

| Context                                                                       | Pattern                                                                                | Tracking |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| Page-level eyebrows (landing, section headers)                                | `text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]`               | `0.2em`  |
| Dense/inline contexts (detail page sections, card metadata, dashboard labels) | `text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]` | `0.15em` |

Page-level eyebrows use `--primary` color; inline section labels use `--muted-foreground`.

### Key Differences from A

|          | Variant A                              | Variant B                                                                        |
| -------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| Headings | Instrument Serif italic                | Inter bold                                                                       |
| Body     | DM Sans                                | Inter regular                                                                    |
| Mono     | Geist Mono                             | Inter (no mono in base system)                                                   |
| Eyebrows | `.eyebrow-editorial` / `.eyebrow-mono` | Manual: `text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]` |

---

## Color Tokens

All defined in `globals.css` under `[data-variant="b"]`. Use `var(--token)` syntax in B components.

### Core Palette (Kinari warm neutrals)

| Token                | Hex       | Usage                  |
| -------------------- | --------- | ---------------------- |
| `--background`       | `#F8F7F4` | Page background        |
| `--foreground`       | `#1C1A17` | Headers, primary text  |
| `--foreground-body`  | `#504D48` | Body paragraphs        |
| `--muted-foreground` | `#78736C` | Captions, metadata     |
| `--card`             | `#FFFFFF` | Card surfaces          |
| `--canvas`           | `#FFFFFF` | Alternating section bg |
| `--surface`          | `#F1EFEB` | Tonal lift / muted bg  |
| `--border`           | `#E2DFD9` | Borders, inputs        |

### Accent & Status

| Token                           | Hex       | Usage                                       |
| ------------------------------- | --------- | ------------------------------------------- |
| `--primary` / `--brand-primary` | `#2D4B8E` | CTAs, links, focus rings, eyebrows          |
| `--brand-secondary`             | `#3A5FA0` | Hover state for primary                     |
| `--accent`                      | `#EDECF3` | Light tint background (avatar badges, tags) |
| `--success` / `--sage`          | `#059669` | Success states                              |
| `--warning` / `--terracotta`    | `#D97706` | Warning states                              |
| `--error` / `--destructive`     | `#EF4444` | Error states                                |
| `--charcoal`                    | `#181714` | Overlays (rare)                             |

### Usage Rules

- **Never** use raw Tailwind colors (`blue-600`, `gray-500`). Always use `var(--token)`.
- Reference via `text-[var(--foreground)]`, `bg-[var(--primary)]`, etc.
- Accent `#2D4B8E` only on: CTA buttons, eyebrow labels, focus rings, link hover, stat suffixes, active nav.
- Body text = `--foreground-body` (#504D48), NOT `--foreground` (that's for headings).
- **Mapbox exception**: Mapbox GL JS paint properties are JS strings and cannot reference CSS vars — hardcoded hex matching token values is acceptable (e.g., `"#2D4B8E"` for primary, `"#1C1A17"` for foreground).
- **Tints**: Use `color-mix(in srgb, var(--token) N%, transparent)` for semi-transparent tints — never hardcode rgba equivalents of token values.

---

## Shadows

B uses layered organic shadows (not A's minimal/dark approach).

| Token               | Value                                    | Usage                             |
| ------------------- | ---------------------------------------- | --------------------------------- |
| `--shadow-sm`       | `0 1px 2px rgba(0,0,0,0.04)`             | Header on scroll, subtle elements |
| `--shadow-card`     | `0 4px 6px -1px rgba(0,0,0,0.05), ...`   | Default card state                |
| `--shadow-elevated` | `0 10px 15px -3px rgba(0,0,0,0.06), ...` | Hover state, popovers             |
| `--shadow-depth`    | `0 20px 25px -5px rgba(0,0,0,0.07), ...` | Hero images, CTA blocks           |

### Hover Pattern

Cards: `shadow-card` default → `shadow-elevated` on hover, applied via:

```tsx
className="transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
style={{ boxShadow: "var(--shadow-card)" }}
```

---

## Layout

### Spacing

| Pattern                    | Classes                                  | Used For             |
| -------------------------- | ---------------------------------------- | -------------------- |
| Section vertical           | `py-16 sm:py-24 lg:py-32`                | All sections         |
| Container                  | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` | Page content wrapper |
| Header height              | `72px` (`--header-h`)                    | Fixed header         |
| Top padding (below header) | `pt-32 lg:pt-36`                         | Hero / first section |

### Section Alternation

Alternate between `#F8F7F4` (background) and `#FFFFFF` (white) — no dividers, breathing room via generous vertical padding.

```
Hero        → bg-white
Stats       → bg-[var(--background)]    (#F8F7F4)
Locations   → bg-white
Testimonials→ bg-[var(--background)]
CTA         → bg-white
```

### Radius

`--radius: 1rem` (16px).

| Element                                                                       | Class          | Size |
| ----------------------------------------------------------------------------- | -------------- | ---- |
| Hero images, CTA blocks                                                       | `rounded-3xl`  | 24px |
| Cards, containers                                                             | `rounded-2xl`  | 16px |
| Buttons, inputs                                                               | `rounded-xl`   | 12px |
| Small inline elements (badges, pills, icon containers, skeleton placeholders) | `rounded-lg`   | 8px  |
| Pills, avatars                                                                | `rounded-full` | —    |

### Cards

- White (`#FFF`) on `#F8F7F4` background
- `shadow-card` default, no borders
- `rounded-2xl` (16px)
- Generous padding: `p-8` for content cards, `p-4` for compact cards

---

## Motion

### Providers

- **Lenis**: Yes (smooth scroll)
- **Custom cursor**: No
- **Parallax / SplitText / ScrollReveal**: No (use framer-motion directly)

### Scroll Reveal Pattern

Subtle fade-up. Keep `y` distance small (8–12px). Longer, softer timing.

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-60px" }}
  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
>
```

### Stagger Pattern (cascade)

Heading enters first → cards cascade after a beat:

```tsx
// Heading: no delay
transition={{ duration: 0.6, ease: bEase }}

// Cards: base delay + per-item stagger
transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: bEase }}
```

Standard easing: `[0.25, 0.1, 0.25, 1]` (define as `bEase` tuple for type safety).

### Hover Interactions (Spring-based)

Cards lift with spring physics:

```tsx
whileHover={{
  y: -3,
  transition: { type: "spring", stiffness: 300, damping: 25 },
}}
```

Image zoom on card hover:

```tsx
className =
  "transition-transform duration-500 ease-out group-hover:scale-[1.04]";
```

Title color shift:

```tsx
className = "transition-colors duration-200 group-hover:text-[var(--primary)]";
```

### Animated Counters

Numbers roll up from 0 when scrolling into view (~1.2s, ease-out cubic). See `StatsB.tsx` `AnimatedNumber` component.

### Ambient Motion

Hero image: slow breathing scale (8s loop, 1→1.03→1):

```tsx
<motion.div
  animate={{ scale: [1, 1.03, 1] }}
  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
/>
```

### Button Press

```tsx
className = "active:scale-[0.98]";
```

### What NOT to Use

- No `SplitText` (A-only)
- No `ScrollReveal` component (A-only, use framer-motion `whileInView` directly)
- No `parallaxZoomIn` / `parallaxHero` / `parallaxSubtle` (A-only)
- No `PageTransition` clip-path wipe (simple cross-fade if needed)
- No custom cursor
- No scroll progress bar
- No texture grain
- No `backdrop-blur` / frosted glass — use solid backgrounds (too techie/SaaS for a Japan aesthetic)

---

## Component Patterns

### Header

Solid white on scroll (no frosted glass):

```tsx
style={{
  backgroundColor: scrolled ? "#fff" : "rgba(255,255,255,0.6)",
  boxShadow: scrolled ? "var(--shadow-sm)" : "none",
}}
```

Logo: `KOKU` in Inter bold, not serif. No KokuMark SVG monogram.

### Buttons

| Type                | Classes                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Primary             | `rounded-xl bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]` |
| Secondary / Outline | `rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]`   |
| Ghost               | `rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)]`                                                      |

Standard height: `h-11` (44px) or `h-12` (48px) for hero CTAs.

### Links

B components use `useVariantHref()` for `/b/` prefix:

```tsx
import { useVariantHref } from "@/lib/variant/VariantContext";
const href = useVariantHref("/trip-builder"); // → "/b/trip-builder"
```

Or hardcode `/b/` prefix for static links in B-only components.

### Save Button (Unified)

Same style across card grid overlay and detail page:

| State   | Background                 | Icon                            | Text            |
| ------- | -------------------------- | ------------------------------- | --------------- |
| Unsaved | White pill, subtle shadow  | Outline heart, `stroke-current` | "Save for trip" |
| Saved   | `var(--primary)` navy pill | Filled white heart              | "Saved"         |

```tsx
// Card overlay (shows on hover, persists when saved)
<button className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
  active ? "bg-[var(--primary)] text-white" : "bg-white/80 text-[var(--foreground)]"
}`}>
  <HeartIcon /> {active ? "Saved" : "Save for trip"}
</button>

// Detail page (always visible)
<button className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium ${
  isSaved ? "bg-[var(--primary)] text-white" : "bg-white text-[var(--foreground)]"
}`}>
```

- Card overlay: `sm:opacity-0 sm:group-hover:opacity-100` when unsaved, always visible when saved
- Entire pill is clickable — never icon-only

### Icon Tooltips

All icon-only buttons use native `title` attributes for hover tooltips:

```tsx
<button title="Grid view" aria-label="Grid view"> <GridIcon /> </button>
<button title="Map view" aria-label="Map view"> <MapIcon /> </button>
```

Apply to: view toggles, search submit, filter close/clear, photo thumbnails, chip remove buttons.

### Footer

Minimal: brand + 2 nav columns + copyright. White bg, top border. All links prefixed with `/b/`.

### Error / 404 Pages

Clean white card on `#F8F7F4` background, Inter bold heading, `--primary` accent buttons. No images, no parallax.

---

## Places Page (`/b/places`)

### Layout Modes

**Grid mode** (default): Intro hero → sticky category bar → seasonal banner → card grid.

**Map mode**: Full-viewport fixed Mapbox map with floating UI layers.

### Category Bar (`CategoryBarB.tsx`)

Single sticky row below the header with: location count + search input + grid/map toggle + refine button + active filter chips.

```tsx
<div className="sticky z-40" style={{ top: "var(--header-h)" }}>
```

- Frosted glass background: always in map mode, on scroll in grid mode
- Category tabs row removed — count shown inline as `"X places"` text

### Map Mode Layout (`PlacesMapLayoutB.tsx`)

Map is `fixed` positioned, filling below header + category bar to viewport bottom:

```tsx
<div data-lenis-prevent className="fixed inset-x-0 bottom-0 z-20"
     style={{ top: "calc(var(--header-h) + 52px)" }}>
```

Key patterns:

- `data-lenis-prevent` on outermost container — prevents Lenis scroll hijack on the map
- `projection: "mercator"` on Mapbox init — avoids globe projection panning issues
- Category bar (z-40) floats above the map (z-20) with backdrop blur
- Map top offset accounts for both header and category bar height (52px)
- Intro section and seasonal banner hidden in map mode
- Floating vertical pill column on the left side (`absolute top-3 left-3 bottom-3 w-56`)
- Pills are individual `bg-white` cards — no panel background
- Bounds-filtered locations with infinite scroll (`PAGE_SIZE = 40`)
- Two-way hover sync: card hover highlights map pin, map pin hover auto-scrolls to pill
- Count badge at top of pill column

### Map Pill Card (`PlacesMapCardB.tsx`)

Compact pill card for the map sidebar:

```
┌────────┬──────────────────────┐
│ 32×32  │ Name           ★ 4.5 │
│ thumb  │ City · category      │
└────────┴──────────────────────┘
```

- `forwardRef` for auto-scroll when map pin hovered
- `isHighlighted` prop: `ring-1 ring-[var(--primary)]/40 bg-white`
- Shadow: `0 1px 6px rgba(0,0,0,0.1)` — light, no `--shadow-card` (too heavy for pills)

### View Mode Persistence

View mode synced to `?view=map` URL search param via `router.replace()`:

```tsx
// In PlacesShellB — setViewMode updates URL
router.replace(`/b/places?view=map`, { scroll: false });
// Init reads from param
const viewParam = searchParams.get("view");
const [viewMode] = useState(viewParam === "map" ? "map" : "grid");
```

Detail page "Back to all places" uses `router.back()` to preserve the view mode state.

### Card Grid (`PlacesCardB.tsx`)

- 4:3 landscape image with category badge + save pill overlay
- Content: name + rating, city, summary (line-clamp-2), category + duration pills
- Save pill appears on hover (unsaved) or persists (saved)

### Detail Page (`PlaceDetailB.tsx`)

Full-page layout: hero image → sticky back bar → title/metadata/save → photo gallery → content sections (overview, tips, practical info, reviews, hours, links) → nearby grid.

---

## File Structure

```
src/components-b/
  LayoutWrapperB.tsx        ← SharedProviders + Lenis + B chrome
  HeaderB.tsx               ← Solid white header (not frosted glass)
  FooterB.tsx               ← Minimal footer
  STYLE_GUIDE.md            ← This file
  landing/                  ← Landing page sections
    index.ts
    HeroB.tsx
    StatsB.tsx
    ShowcaseB.tsx
    FeaturedLocationsB.tsx
    FeaturedExperiencesB.tsx
    FeaturedGuidesB.tsx
    TestimonialsB.tsx
    FinalCtaB.tsx
  features/
    places/
      PlacesShellB.tsx        ← Main shell: state, filters, view mode toggle
      PlacesShellBLazy.tsx     ← Lazy wrapper for code-split
      PlacesIntroB.tsx         ← Hero heading (hidden in map mode)
      CategoryBarB.tsx         ← Sticky search/filter/toggle bar
      FilterPanelB.tsx         ← Slide-in refine panel
      PlacesGridB.tsx          ← Infinite-scroll card grid
      PlacesCardB.tsx          ← Location card with save pill
      PlacesCardPanelB.tsx     ← Card detail panel
      PlacesMapLayoutB.tsx     ← Fixed full-viewport map + floating pill column
      PlacesMapCardB.tsx       ← Compact pill card for map sidebar
      PlacesMapB.tsx           ← Mapbox GL map (clusters, bounds, hover)
      PlaceDetailB.tsx         ← Full-page location detail
    trip-builder/
      TripBuilderB.tsx         ← Main trip builder shell
      StepShellB.tsx           ← Step container with nav buttons
      IntroStepB.tsx           ← Step 0: intro/welcome
      DateStepB.tsx            ← Step 1: date picker
      EntryPointStepB.tsx      ← Step 2: arrival city
      VibeStepB.tsx            ← Step 3: vibe selection
      VibeCardB.tsx            ← Individual vibe card
      RegionStepB.tsx          ← Step 4: region selection
      RegionRowB.tsx           ← Region row with city toggles
      RegionDetailPanelB.tsx   ← Region hover detail panel
      ReviewStepB.tsx          ← Step 5: review summary
      TripSummaryB.tsx         ← Summary card component
      GeneratingOverlayB.tsx   ← Full-screen generating state
    itinerary/
      ItineraryShellB.tsx      ← Main itinerary layout (timeline + map split)
      ItineraryTimelineB.tsx   ← Day timeline with activities
      DayHeaderB.tsx           ← Day header with date/city
      DaySelectorB.tsx         ← Day pill selector bar
      PlaceActivityRowB.tsx    ← Place activity with actions
      NoteActivityRowB.tsx     ← Note/text activity row
      ActivityRowB.tsx         ← Base activity row
      SortableActivityB.tsx    ← Drag-sortable activity wrapper
      TravelSegmentB.tsx       ← Travel time between activities
      AccommodationBookendB.tsx← Check-in/check-out bookend
      SmartPromptCardB.tsx     ← Smart prompt suggestion card
      GuideSegmentCardB.tsx    ← Guide content segment
      ItinerarySkeletonB.tsx   ← Loading skeleton
      TripConfidenceDashboardB.tsx ← Trip quality metrics
    guides/
      GuidesPageClientB.tsx    ← Guides listing page
      GuideDetailClientB.tsx   ← Guide detail page
      GuideCardB.tsx           ← Guide card component
      AuthorProfileB.tsx       ← Author bio page
    experiences/
      ExperiencesPageClientB.tsx ← Experiences listing page
      ExperienceDetailClientB.tsx← Experience detail page
      ExperienceCardB.tsx      ← Experience card component
    discover/
      DiscoverShellB.tsx       ← Discover page shell
      DiscoverMapB.tsx         ← Discover Mapbox map
      DiscoverDrawerB.tsx      ← Bottom drawer / desktop strip
    dashboard/
      DashboardClientB.tsx     ← Dashboard page client
      DashboardHeaderB.tsx     ← Dashboard header with greeting
      StatsSectionB.tsx        ← User stats section
      TripsSectionB.tsx        ← Trips list section
      AccountSectionB.tsx      ← Account settings section
    ask-koku/
      AskKokuButtonB.tsx       ← Floating action button
      AskKokuPanelB.tsx        ← Slide-in chat panel
      AskKokuChatB.tsx         ← Chat message container
      AskKokuInputB.tsx        ← Chat input field
      AskKokuMessageB.tsx      ← Individual message bubble
      AskKokuSuggestionsB.tsx  ← Suggestion chips
      AskKokuLocationCardB.tsx ← Location card in chat
      AskKokuVideoImportCardB.tsx ← Video import card in chat
      AskKokuTripPlanCardB.tsx ← Trip plan card in chat
    account/
      AccountClientB.tsx       ← Account settings page
    signin/
      SignInClientB.tsx        ← Sign-in page
    saved/
      SavedClientB.tsx         ← Saved/favorites page
  ui/                        ← B UI kit (build as needed)

src/app/b/
  layout.tsx                 ← Inter font, VariantProvider, LayoutWrapperB
  page.tsx                   ← B landing
  places/page.tsx            ← Places grid/map page
  places/[id]/page.tsx       ← Place detail page
  trip-builder/page.tsx      ← Trip builder
  itinerary/page.tsx         ← Itinerary viewer
  guides/page.tsx            ← Guides listing
  guides/[slug]/page.tsx     ← Guide detail
  guides/authors/page.tsx    ← Authors listing
  guides/authors/[slug]/page.tsx ← Author profile
  experiences/page.tsx       ← Experiences listing
  experiences/[slug]/page.tsx← Experience detail
  discover/page.tsx          ← Discover map
  dashboard/page.tsx         ← User dashboard
  account/page.tsx           ← Account settings
  saved/page.tsx             ← Saved places
  signin/page.tsx            ← Sign-in
  shared/[token]/page.tsx    ← Shared itinerary (read-only)
  [...fallback]/page.tsx     ← Catch-all redirect to A
  not-found.tsx              ← B-styled 404
  error.tsx                  ← B error boundary
```

### Import Alias

`@b/*` maps to `src/components-b/*` (defined in tsconfig.json).

```tsx
import { HeaderB } from "@b/HeaderB";
import { HeroB } from "@b/landing";
```

---

## Building New B Pages

1. Create `src/app/b/<route>/page.tsx` — the catch-all redirect stops automatically
2. Use same data sources as A (Sanity, Supabase) — only the presentation changes
3. Follow `content?.field ?? "hardcoded default"` fallback pattern
4. Use `var(--token)` for all colors — never raw hex in components
5. Import shared hooks/services from `@/*`, B components from `@b/*`
6. Keep all motion subtle: `y: 8-12`, `duration: 0.5-0.7`, spring hovers
7. Test both `/route` (A) and `/b/route` (B) — ensure A is unchanged
