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

| Role                   | Weight         | Color                        | Tracking          | Example                    |
| ---------------------- | -------------- | ---------------------------- | ----------------- | -------------------------- |
| Display / Page headers | 700 (bold)     | `--foreground` #1A1D21       | `-0.04em`         | Hero headline              |
| Section titles         | 700 (bold)     | `--foreground` #1A1D21       | `-0.02em`         | "Places worth the journey" |
| Eyebrow labels         | 600 (semibold) | `--primary` #2D4B8E          | `0.2em` uppercase | "FEATURED PLACES"          |
| Body text              | 400 (regular)  | `--foreground-body` #475569  | `0`               | Descriptions, paragraphs   |
| Secondary / Captions   | 400 (regular)  | `--muted-foreground` #64748B | `0`               | Metadata, timestamps       |
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

### Core Palette

| Token                | Hex       | Usage                  |
| -------------------- | --------- | ---------------------- |
| `--background`       | `#F7F9FB` | Page background        |
| `--foreground`       | `#1A1D21` | Headers, primary text  |
| `--foreground-body`  | `#475569` | Body paragraphs        |
| `--muted-foreground` | `#64748B` | Captions, metadata     |
| `--card`             | `#FFFFFF` | Card surfaces          |
| `--canvas`           | `#FFFFFF` | Alternating section bg |
| `--surface`          | `#F1F5F9` | Tonal lift / muted bg  |
| `--border`           | `#E2E8F0` | Borders, inputs        |

### Accent & Status

| Token                           | Hex       | Usage                                       |
| ------------------------------- | --------- | ------------------------------------------- |
| `--primary` / `--brand-primary` | `#2D4B8E` | CTAs, links, focus rings, eyebrows          |
| `--brand-secondary`             | `#3A5FA0` | Hover state for primary                     |
| `--accent`                      | `#EDF1F8` | Light tint background (avatar badges, tags) |
| `--success` / `--sage`          | `#059669` | Success states                              |
| `--warning` / `--terracotta`    | `#D97706` | Warning states                              |
| `--error` / `--destructive`     | `#EF4444` | Error states                                |
| `--charcoal`                    | `#0F172A` | Overlays (rare)                             |

### Usage Rules

- **Never** use raw Tailwind colors (`blue-600`, `gray-500`). Always use `var(--token)`.
- Reference via `text-[var(--foreground)]`, `bg-[var(--primary)]`, etc.
- Accent `#2D4B8E` only on: CTA buttons, eyebrow labels, focus rings, link hover, stat suffixes, active nav.
- Body text = `--foreground-body` (#475569), NOT `--foreground` (that's for headings).

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

Alternate between `#F7F9FB` (background) and `#FFFFFF` (white) — no dividers, breathing room via generous vertical padding.

```
Hero        → bg-white
Stats       → bg-[var(--background)]    (#F7F9FB)
Locations   → bg-white
Testimonials→ bg-[var(--background)]
CTA         → bg-white
```

### Radius

`--radius: 1rem` (16px). Use `rounded-2xl` for cards/containers, `rounded-xl` for buttons/inputs, `rounded-3xl` for hero images and CTA blocks.

### Cards

- White (`#FFF`) on `#F7F9FB` background
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

---

## Component Patterns

### Header

Frosted glass on scroll:

```tsx
style={{
  backgroundColor: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
  backdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
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
<button className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md ${
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

Clean white card on `#F7F9FB` background, Inter bold heading, `--primary` accent buttons. No images, no parallax.

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
- Pills are individual `bg-white/90 backdrop-blur-sm` cards — no panel background
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
  LayoutWrapperB.tsx      ← SharedProviders + Lenis + B chrome
  HeaderB.tsx             ← Frosted glass header
  FooterB.tsx             ← Minimal footer
  STYLE_GUIDE.md          ← This file
  landing/                ← Landing page sections
    index.ts
    HeroB.tsx
    StatsB.tsx
    FeaturedLocationsB.tsx
    TestimonialsB.tsx
    FinalCtaB.tsx
  features/
    places/
      PlacesShellB.tsx      ← Main shell: state, filters, view mode toggle
      PlacesShellBLazy.tsx   ← Lazy wrapper for code-split
      PlacesIntroB.tsx       ← Hero heading (hidden in map mode)
      CategoryBarB.tsx       ← Sticky search/filter/toggle bar
      FilterPanelB.tsx       ← Slide-in refine panel
      PlacesGridB.tsx        ← Infinite-scroll card grid
      PlacesCardB.tsx        ← Location card with save pill
      PlacesMapLayoutB.tsx   ← Fixed full-viewport map + floating pill column
      PlacesMapCardB.tsx     ← Compact pill card for map sidebar
      PlacesMapB.tsx         ← Mapbox GL map (clusters, bounds, hover)
      PlaceDetailB.tsx       ← Full-page location detail
  ui/                     ← B UI kit (build as needed)

src/app/b/
  layout.tsx              ← Inter font, VariantProvider, LayoutWrapperB
  page.tsx                ← B landing
  places/page.tsx         ← Places grid/map page
  places/[id]/page.tsx    ← Place detail page
  [...fallback]/page.tsx  ← Catch-all redirect to A
  not-found.tsx           ← B-styled 404
  error.tsx               ← B error boundary
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
