# Variant C Style Guide: Editorial Minimalism

## Identity

High-contrast editorial layout. Black, white, and Japanese vermillion.
Plus Jakarta Sans at every weight. Sharp corners everywhere. Borders, not shadows.
White space is structural. Every element earns its place.

---

## Typography

### Font

**Plus Jakarta Sans** (single family) via `--font-plus-jakarta`.
Loaded in `src/app/c/layout.tsx`. Weight 200-800 available.

### Type Scale

| Level            | Size                          | Weight | Tracking  |
| ---------------- | ----------------------------- | ------ | --------- |
| Hero headline    | `clamp(2rem, 4vw, 4.5rem)`    | 800    | `-0.04em` |
| Section H2       | `clamp(1.75rem, 3.5vw, 3rem)` | 700    | `-0.03em` |
| Philosophy H2    | `clamp(2rem, 4.5vw, 4rem)`    | 700    | `-0.03em` |
| Showcase H2      | `clamp(2rem, 4vw, 3.5rem)`    | 700    | `-0.03em` |
| H3 (card titles) | `text-base lg:text-lg`        | 500    | `-0.01em` |
| Body             | `text-sm lg:text-[15px]`      | 400    | `0`       |
| Eyebrow          | `text-[10px]`                 | 700    | `0.2em`   |
| Button/Nav label | `text-[11px]`                 | 700    | `0.15em`  |
| Sidebar vertical | `text-[9px]`                  | 700    | `0.3em`   |

### Rules

- All headings use inline `style={{ fontFamily: "var(--font-plus-jakarta)..." }}`
- Eyebrows: `text-[10px] font-bold uppercase tracking-[0.2em]`
- Buttons/nav: `text-[11px] font-bold uppercase tracking-[0.15em]`
- No italic. No serif.

---

## Color Architecture

### Palette

| Token                | Value     | Usage                              |
| -------------------- | --------- | ---------------------------------- |
| `--background`       | `#fafafa` | Page background                    |
| `--foreground`       | `#0a0a0a` | Primary text                       |
| `--primary`          | `#e63312` | Japanese vermillion. CTAs, accents |
| `--card`             | `#ffffff` | Card surfaces                      |
| `--surface`          | `#f2f2f2` | Alternating section background     |
| `--border`           | `#e0e0e0` | Hairline structural borders        |
| `--muted-foreground` | `#6b6b6b` | Secondary text, eyebrows           |

### Color Block Sections

`data-section-*` attributes remap CSS custom properties. Always use `bg-[var(--background)]`:

```html
<section data-section-dark className="bg-[var(--background)]">
  <!-- #0a0a0a -->
  <section data-section-accent className="bg-[var(--background)]">
    <!-- #e63312 -->
  </section>
</section>
```

**Never** use `var(--foreground)` as a background inside these sections.

### Section Rhythm

```
Hero              -> background (#fafafa)
Philosophy        -> surface    (#f2f2f2)
Showcase          -> accent     (#e63312)  vermillion block
Featured Locations -> background (#fafafa)
Seasonal Spotlight -> surface    (#f2f2f2)
Experiences       -> background (#fafafa)
Testimonials      -> dark       (#0a0a0a)  black block
Featured Guides   -> surface    (#f2f2f2)
Ask Koku          -> background (#fafafa)
Typographic Break -> surface    (#f2f2f2)
Final CTA         -> dark       (#0a0a0a)  black block
```

Every adjacent pair alternates. Each section has a `border-b` hairline (dark sections use `border-white/10`).

---

## Hero Layout

Editorial split with Jurekka-style composition:

- **Left sidebar** (56px, desktop only): Vertical "Koku Travel" + copyright labels
- **Image**: Contained block, not edge-to-edge. Positioned via absolute (`top: 5%, right: 8%, width: 58%, height: 78%`). Vermillion accent line on left edge.
- **Dot grid**: SVG circle pattern behind text area at 6% opacity
- **Headline**: Bottom-left, overlapping the image boundary zone. Word-by-word stagger reveal on load.
- **CTAs + description**: Below headline
- **Scroll indicator**: Bottom-left, "Scroll to explore" + bouncing vermillion arrow

### Hero Parallax (scroll-driven)

| Layer            | Speed                   | Direction               |
| ---------------- | ----------------------- | ----------------------- |
| Image            | +12%                    | Down (background depth) |
| Headline         | -25%                    | Up (foreground)         |
| Description/CTAs | -40%                    | Up fastest              |
| Dot grid         | +15%                    | Down (background)       |
| Sidebar          | -8%                     | Gentle up               |
| Scroll indicator | Fades out by 15% scroll |                         |

---

## Grid System

### Container

```
max-w-[1400px] px-6 lg:px-10
```

### Column Grid

12-column via `lg:grid lg:grid-cols-12 lg:gap-4`:

- **Section headings**: `lg:col-span-8` (left-aligned, never centered)
- **CTA content**: `lg:col-span-8`
- **Showcase steps**: `lg:col-span-6 lg:col-start-7` (right column)

### Rules

- Left-align section headings. The typographic break is the ONE centered exception.
- Use `gap-px bg-[var(--border)]` parent for border-box card grids.

---

## Spacing

### Section Vertical

| Context           | Pattern                                                       |
| ----------------- | ------------------------------------------------------------- |
| Major sections    | `py-24 sm:py-32 lg:py-48`                                     |
| Typographic break | `min-h-[60vh] lg:min-h-[70vh]` with `py-24 sm:py-32 lg:py-48` |
| Header to content | `mt-12 lg:mt-16`                                              |
| Philosophy stats  | `mt-16 lg:mt-24`                                              |

---

## Borders, Not Shadows

- `--shadow-sm`: `none`
- `--shadow-card`: `0 1px 2px rgba(0,0,0,0.04)` (barely visible)
- `--shadow-elevated`: `0 2px 8px rgba(0,0,0,0.06)` (hover only)
- `--shadow-glow`: `none`

Borders do the structural work:

- Section separators: `border-b border-[var(--border)]`
- Card grids: `gap-px bg-[var(--border)]` parent
- Header: `border-bottom` transitions from transparent to `var(--border)` on scroll

---

## Radius

**Zero. Everything.** `--radius: 0px`.
Only exception: user avatar (`rounded-full`).

---

## Motion

### Easing

```typescript
const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
```

### Entry Animations (viewport-triggered, `once: true`)

| Type        | Properties                | Duration | Use                               |
| ----------- | ------------------------- | -------- | --------------------------------- |
| Fade-up     | `opacity: 0, y: 16`       | 0.5s     | Default for all content           |
| Scale-in    | `opacity: 0, scale: 0.95` | 0.6s     | Stat blocks, typographic break    |
| Slide-right | `opacity: 0, x: 24`       | 0.5s     | Showcase steps, testimonial cards |
| Line-grow   | `width: 0` to `width: 48` | 0.6s     | Accent lines (FinalCTA)           |

### Hero-specific

| Type            | Properties                       | Duration                |
| --------------- | -------------------------------- | ----------------------- |
| Image reveal    | `opacity: 0, scale: 1.06` to `1` | 1.2s                    |
| Word stagger    | `opacity: 0, y: 30` per word     | 0.5s, +0.06s delay each |
| Scroll parallax | Per-layer `useTransform`         | Continuous (GPU)        |
| Arrow bounce    | `y: [0, 4, 0]`                   | 1.5s infinite           |

### Stagger

- Cards/list items: `delay: i * 0.08`
- Showcase steps: `delay: i * 0.12`
- Hero words: `delay: 0.3 + i * 0.06`
- Sequential headers: eyebrow 0s, heading 0.1s, content 0.2s

### Hover

- Card images: `group-hover:scale-[1.03]` via Tailwind `transition-transform duration-500`
- Card titles: `group-hover:text-[var(--primary)]` via Tailwind `transition-colors duration-200`
- Buttons: `active:scale-[0.98]` via Tailwind
- Links: `hover:opacity-70` or color inversion

### Rules

- All motion gated behind `useReducedMotion()` / `noMotion`
- GPU-composited only: `transform` + `opacity`. No layout-triggering properties.
- Scroll indicator fades out via `useTransform(scrollYProgress, [0, 0.15], [1, 0])`
- No continuous animations except hero arrow bounce
- No SplitText component, no custom cursor, no scroll progress bar, no grain textures

---

## Component Patterns

### Buttons

```
h-11 px-7 text-[11px] font-bold uppercase tracking-[0.15em]
```

- **Primary**: `bg-[var(--primary)] text-white hover:opacity-90`
- **Secondary**: `border border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]`
- **Ghost on dark**: `border border-white/25 text-white/70 hover:border-white/50`
- All: `active:scale-[0.98]`, no rounded corners

### Cards

- `gap-px` grid with `bg-[var(--border)]` parent
- Image `aspect-[4/3]` (locations, experiences) or `aspect-[3/2]` (guides)
- Content padding `p-5 lg:p-6`
- Card title weight: `500` (medium), not bold
- Hover: image scale + title color shift
- **Overlays flush**: Badges and action buttons on card images use `top-0 left-0` / `top-0 right-0` (no inset). Flush edges reinforce the zero-radius grid aesthetic.

### Header

- Fixed 72px, hairline border on scroll
- Logo: Plus Jakarta Sans, extrabold, uppercase, `tracking-[0.1em]`
- Nav: `text-[11px]` uppercase, `gap-10`
- Two hamburger lines on mobile

### Footer

- 12-column grid, logo spans 4 cols, nav columns span 2 each
- `text-[10px]` uppercase column headers

---

## What NOT to Use

| Element                   | Why                                          |
| ------------------------- | -------------------------------------------- |
| `rounded-*`               | `--radius: 0px` everywhere                   |
| `shadow-sm`, `shadow-lg`  | Borders, not shadows                         |
| `font-serif`, `italic`    | Not this variant's aesthetic                 |
| `texture-grain`           | Decoration                                   |
| Custom cursor             | Distraction                                  |
| `bg-black/`               | Use `var(--foreground)` or `var(--charcoal)` |
| Raw Tailwind colors       | Always `var(--token)`                        |
| `btn-koku`                | A-specific                                   |
| `eyebrow-editorial`       | A-specific                                   |
| Centered section headings | Left-align (typographic break excepted)      |
| `var(--font-syne)`        | Replaced by `var(--font-plus-jakarta)`       |

---

## File Organization

```
src/components-c/
  HeaderC.tsx
  FooterC.tsx
  LayoutWrapperC.tsx
  STYLE_GUIDE.md
  landing/
    HeroC.tsx
    PhilosophyC.tsx
    ShowcaseC.tsx
    FeaturedLocationsC.tsx
    SeasonalSpotlightC.tsx
    FeaturedExperiencesC.tsx
    TestimonialsC.tsx
    FeaturedGuidesC.tsx
    AskKokuPreviewC.tsx
    TypographicBreakC.tsx
    FinalCtaC.tsx
    index.ts
  features/
    ask-koku/AskKokuButtonC.tsx
    ...
  ui/
    ...
```

Import via `@c/*` path alias. Shared hooks/utils from `@/*`.
