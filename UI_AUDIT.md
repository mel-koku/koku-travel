# UI/UX Audit — Consolidated Findings & Implementation Plan

> Generated 2026-02-15. Sweep covered: landing, trip builder, itinerary, explore, guides/experiences, shared/layout, page routes.

---

## Tier 1 — High Impact, Cross-Cutting (fix once, benefits everywhere)

### 1.1 Add skip navigation link

- **Where**: `Header.tsx`
- **What**: No skip-to-content link exists. Keyboard/screen reader users must tab through entire header on every page.
- **WCAG**: 2.4.1 Bypass Blocks (Level A)

### 1.2 Global focus-visible styles

- **Where**: All interactive elements across all components
- **What**: Almost no component has `focus-visible:ring-2 focus-visible:ring-brand-primary` or equivalent. Keyboard users can't see where focus is.
- **Scope**: ~60+ files. Best approach: add a global CSS rule for `a, button, [role="button"], [tabindex="0"]` in `globals.css` rather than per-component.
- **WCAG**: 2.4.7 Focus Visible (Level AA)

### 1.3 Missing page metadata

- **Where**: 9 pages missing `export const metadata` entirely
- **Pages**: `/` (landing), `/trip-builder`, `/account`, `/favorites`, `/itinerary`, `/signin`, `/dashboard`, `/not-found`, all `/ui/*`
- **What**: No page titles, descriptions, or social previews for these routes.

### 1.4 Missing OpenGraph images

- **Where**: `/explore`, `/guides`, `/experiences`, `/guides/authors`, root layout fallback
- **What**: Pages have title/description but no `openGraph` object. Social shares show generic preview.

### 1.5 Add loading.tsx for key pages

- **Where**: Only `/dashboard` has one. Missing from all other routes.
- **Priority pages**: `/explore` (map load), `/guides/[slug]` (Sanity fetch), `/experiences/[slug]`, `/itinerary`, `/favorites`
- **What**: Users see blank screen during data fetch instead of skeleton/spinner.

### 1.6 Add error.tsx for key pages

- **Where**: Only root and `/dashboard` have error boundaries.
- **Priority pages**: `/explore`, `/guides/[slug]`, `/experiences/[slug]`, `/itinerary`
- **What**: Errors bubble up to root boundary, losing page context.

---

## Tier 2 — Accessibility Fixes (component-level)

### 2.1 ARIA labels on icon-only buttons

- **Files**: `GuidePreamble.tsx` (bookmark), `GuideFooter.tsx` (back arrow), `ExperienceFooter.tsx` (back arrow), `ExperiencePracticalInfo.tsx` (icons), `LocationEmbedBlock.tsx` (icons)
- **What**: Buttons/links containing only SVG icons have no accessible name.

### 2.2 Focus traps in modals/panels

- **Files**: `LocationExpanded.tsx`, `FilterPanel.tsx`, `Modal.tsx` (fragile custom implementation)
- **What**: Keyboard focus can escape modals into background content. No focus restoration on close.
- **Fix**: Use `focus-trap-react` or improve custom trap in `Modal.tsx`.

### 2.3 Keyboard handlers for tabIndex={0} elements

- **Files**: `EntryPointStep.tsx` (airport dots on map — `tabIndex={0}` but no `onKeyDown`), `RegionStep.tsx` (mobile expand/collapse)
- **What**: Elements are focusable but pressing Enter/Space does nothing.

### 2.4 aria-live regions for dynamic content

- **Files**: `VibeStep.tsx` (selection counter), `DateStep.tsx` (duration display, validation errors), `BudgetInput.tsx` (warning messages)
- **What**: Dynamic text changes aren't announced to screen readers. Need `aria-live="polite"` or `role="alert"`.

### 2.5 Color contrast issues

- **Pattern**: `text-white/40`, `text-white/50`, `text-white/60` used extensively in overlays
- **Files**: `FinalCTA.tsx` (subtext), `VibeCard.tsx` (index/description), `GuideHero.tsx`, `ExperienceHero.tsx`, `LinkedLocations.tsx`, `FeaturedGuides.tsx`, `StepProgressTrack.tsx`
- **What**: Low-opacity white text likely fails WCAG AA (4.5:1) contrast ratio.
- **Also**: `text-[10px]` used in 6+ components — below recommended minimum for readability.

---

## Tier 3 — Design System Compliance

### 3.1 Hardcoded hex colors in map components

- **Files**:
  - `ExploreMap.tsx`: `#c4504f`, `#daa54e`, `#3da193`, `#f0e8dc`, `#1a1714`, multiple `rgba()` values
  - `ItineraryMap.tsx`: `#8c2f2f`, `#2d7a6f`
  - `ItineraryMapPanel.tsx`: same hex values
  - `RegionMapCanvas.tsx`: hardcoded `rgba()` values
  - `HeroOpening.tsx`: `rgba(26,23,20,...)`
- **What**: Should use CSS variables (`var(--color-brand-primary)`, etc.) for theme consistency.

### 3.2 Z-index scale cleanup

- **Current state**: Undocumented, inconsistent (`z-50` header, `z-60` scroll progress, `z-[100]` menu, `z-1200` modal, `z-[1300]` toast)
- **Where**: `globals.css` has incomplete 4-layer comment; actual codebase uses many more.
- **Fix**: Define full z-index scale in `globals.css`, document in CLAUDE.md.

### 3.3 Spacing inconsistencies

- **Files**: `ItineraryShell.tsx` (`px-3` vs design system `px-4`), `ExploreIntro.tsx` (`pt-32 pb-4` vs functional tier), `ExperiencePracticalInfo.tsx` (editorial tier instead of functional)
- **What**: Several components don't follow the 3-tier spacing system defined in CLAUDE.md.

### 3.4 Border radius inconsistencies

- **Files**: `Select.tsx` (`rounded-md`), some inputs use `rounded-lg` instead of `rounded-xl`
- **What**: Design system specifies `rounded-xl` for cards/containers/inputs.

### 3.5 Inconsistent loading indicators

- **Files**: `TravelSegment.tsx` (inline spinner SVG), `PlaceActivityRow.tsx` (`animate-pulse`), `TravelModeSelector.tsx` (inline spinner SVG)
- **What**: Different loading patterns in similar contexts. Should standardize.

---

## Tier 4 — Mobile Polish

### 4.1 Safe area insets missing

- **Files**: `ItineraryShell.tsx` (mobile map expansion — no `pt-[env(safe-area-inset-top)]`; activities list — no bottom padding), `FilterPanel.tsx` (no bottom safe area), `ExploreMapLayout.tsx` (map expansion)
- **What**: Content extends behind notch/home indicator on iOS.

### 4.2 Touch target sizes

- **Files**: `GuideFilterBar.tsx` (filter buttons `px-3` may be <44px wide), `ExperiencesPageClient.tsx` (same), `Radio.tsx`/`Checkbox.tsx` (effective area ~38px due to padding)
- **What**: Some touch targets below 44px minimum on mobile.

### 4.3 Mobile map touch events

- **Files**: `ItineraryMapPanel.tsx` (line 389) — marker hover shows popup but touch doesn't trigger `mouseover`
- **What**: Mobile users can't see marker popups because only hover events are bound.

### 4.4 Filter bar scroll indicators

- **Files**: `GuideFilterBar.tsx`, `ExperiencesPageClient.tsx`, `CategoryBar.tsx`
- **What**: Horizontal scroll with hidden scrollbar but no visual hint that content is scrollable (no fade gradient or indicator).

### 4.5 Time picker popover overflow

- **Files**: `PlaceActivityRow.tsx` (line 508) — absolute positioned popover can overflow viewport on small screens
- **What**: Needs responsive positioning or modal treatment on mobile.

---

## Tier 5 — UX Improvements

### 5.1 Newsletter form non-functional

- **File**: `Footer.tsx` (lines 72-84)
- **What**: Email input and button exist but have no `onSubmit` handler or API connection. Misleading.
- **Fix**: Implement or remove.

### 5.2 Semantic HTML improvements

- **Files**: `GuideDetailClient.tsx`, `ExperienceDetailClient.tsx` — use `<div>` instead of `<article>`
- **Also**: No landing page `<section>` has `aria-label` or `aria-labelledby` for landmark navigation
- **What**: Better semantics help screen readers and SEO.

### 5.3 Image loading states

- **Files**: `GuideCard.tsx`, `ExperienceCard.tsx`, `LinkedLocations.tsx`
- **What**: No skeleton/blur placeholder while images load. Cards show empty space then pop in.

### 5.4 Inconsistent empty/error states

- **Files**: Different visual treatments — `ItineraryTimeline.tsx` (dashed border), `ItineraryMapPanel.tsx` (plain text), various card fallbacks ("No image" text)
- **What**: Should standardize empty state pattern with a consistent visual.

### 5.5 Hardcoded location count

- **Files**: `FeaturedLocations.tsx` — hardcoded "3,907+ places" (now stale, should be ~3,756)
- **What**: Either fetch dynamically or remove.

### 5.6 MenuOverlay focus race condition

- **File**: `MenuOverlay.tsx` (lines 69-83)
- **What**: Uses `setTimeout(300)` to focus first link after animation. Race condition if user closes quickly.
- **Fix**: Tie focus management to animation completion callback.

### 5.7 Dropdown positioning complexity

- **File**: `Dropdown.tsx` (lines 106-278) — 172 lines of positioning logic, 4 nested rAF calls
- **What**: Fragile, potential perf overhead. Consider Radix UI primitives.

---

## Summary

| Tier | Category                                                  | Issue Count | Priority |
| ---- | --------------------------------------------------------- | ----------- | -------- |
| 1    | Cross-cutting (skip link, focus, metadata, loading/error) | 6           | Highest  |
| 2    | Accessibility (ARIA, focus traps, contrast)               | 5           | High     |
| 3    | Design system (colors, z-index, spacing, radius)          | 5           | Medium   |
| 4    | Mobile polish (safe areas, touch targets, map)            | 5           | Medium   |
| 5    | UX improvements (newsletter, semantics, images)           | 7           | Lower    |

**Total: 28 actionable items** (distilled from 200+ individual findings across 7 area sweeps)
