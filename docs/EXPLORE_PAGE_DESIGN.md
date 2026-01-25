# Explore Page Design System

This document outlines the design decisions, components, and utilities used in the Explore page.

## Overview

The Explore page features a hero carousel showcasing featured destinations, followed by a filterable grid of all locations. The design follows the Koku Travel earthy style guide.

## Color Palette

All colors are defined in `tailwind.config.js` and `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `brand-primary` | `#8b7355` | Primary actions, active states |
| `charcoal` | `#2d2a26` | Text, headings |
| `stone` | `#a39e93` | Secondary text, muted elements |
| `surface` | `#f7f4f0` | Card backgrounds, sections |
| `sand` | `#e8e4de` | Borders, hover states |
| `sage` | `#607263` | Success states, active itinerary |
| `cream` | `#fffcf9` | Page background |

## Typography

Uses the Augmented Fourth scale (1.414 ratio):

| Size | Pixels | Usage |
|------|--------|-------|
| `text-[10px]` | 10px | Badges, small labels |
| `text-xs` | 12px | Metadata, captions |
| `text-sm` | 14px | Body text, descriptions |
| `text-base` | 16px | Default body |
| `text-xl` | 20px | Section headers |
| `text-2xl` | 24px | Page titles |
| `text-3xl` | 30px | Hero headings |

Serif font (`font-serif` / Playfair Display) is used for hero headings.

## Custom Utilities

### Shadow Depth (`shadow-depth`)

A layered shadow for elevated cards:

```css
shadow-depth: 0 4px 6px -1px rgba(0,0,0,0.05),
              0 10px 15px -3px rgba(0,0,0,0.08),
              0 20px 25px -5px rgba(0,0,0,0.05)
```

### Shimmer Animation

Loading skeleton animation defined in `globals.css`:

```css
.shimmer {
  background: linear-gradient(90deg, var(--surface) 25%, var(--sand) 50%, var(--surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
```

## Components

### FeaturedCarousel

**Location:** `src/components/features/explore/FeaturedCarousel.tsx`

Hero section showcasing top-rated destinations with an infinite scroll carousel.

**Features:**
- "Local's Choice" branding with serif typography
- 3-card layout with center spotlight (1.7x scale)
- Non-spotlight cards: `scale-[0.7] opacity-50 grayscale-[40%]`
- Auto-play with progress indicator (4 second interval)
- Navigation dots and arrow buttons
- Scroll-down indicator (fixed lower-right, hides on scroll)
- Mobile swipe hint

**Props:**
```typescript
type FeaturedCarouselProps = {
  locations: Location[];
  totalLocations?: number;
};
```

**Spotlight Card Content:**
- Rating badge (top-left, glassmorphism)
- Category badge (top-right, brand-primary background)
- Location name and city/region
- Description (desktop only, 2-line clamp)

### LocationCard

**Location:** `src/components/features/explore/LocationCard.tsx`

Individual location card with hover actions.

**Features:**
- 4:3 aspect ratio image
- Hover effects: lift (`-translate-y-1`), shadow increase, border color change
- Overlay actions with glassmorphism (heart, add to itinerary)
- Mobile: actions always visible
- Desktop: actions appear on hover with slide-up animation
- Title color transitions to `brand-primary` on hover
- Category displayed as rounded pill

**Interaction Pattern:**
- Image area uses `role="button"` to avoid nested button hydration errors
- Action buttons positioned as siblings with `pointer-events-auto`

### LocationGrid

**Location:** `src/components/features/explore/LocationGrid.tsx`

Responsive grid layout for location cards.

**Grid Configuration:**
- Mobile: 1 column
- sm (640px+): 2 columns
- lg (1024px+): 3 columns
- xl (1280px+): 4 columns

**Gaps:** `gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-10`

**Load More Button:**
- Expands on hover (`hover:px-10`)
- Down arrow icon with animation
- Tactile feedback (`active:scale-[0.98]`)

### ActiveFilterChips

**Location:** `src/components/features/explore/ActiveFilterChips.tsx`

Filter chip container with subtle background.

**Styling:**
- Container: `bg-surface/50 rounded-2xl px-4 py-3`
- Chips: `bg-background border border-border/50 rounded-full`
- Click feedback: `active:scale-[0.97]`

### ExploreShell

**Location:** `src/components/features/explore/ExploreShell.tsx`

Main explore page container orchestrating all components.

**Layout:**
- Full-width hero section (outside max-width container)
- Constrained content area (`max-w-7xl`)
- Decorative divider between hero and grid

**Hero Section Background:**
```css
bg-gradient-to-b from-surface via-surface/90 to-background
```

With radial gradient overlay:
```css
bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
from-sand/30 via-transparent to-transparent
```

## Accessibility

- All interactive elements have focus-visible states
- Action buttons have aria-labels
- Image clickable areas use `role="button"` with `tabIndex={0}` and keyboard handlers
- Touch targets minimum 40px (h-10)
- Reduced motion: animations respect user preferences via Tailwind defaults

## Responsive Breakpoints

| Breakpoint | Width | Key Changes |
|------------|-------|-------------|
| Default | < 640px | Single column, visible actions, smaller text |
| sm | 640px+ | 2 columns, hover actions, larger carousel |
| lg | 1024px+ | 3 columns |
| xl | 1280px+ | 4 columns, largest text sizes |

## Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Card hover | 300ms | default |
| Carousel transition | 500ms | ease-out |
| Auto-play interval | 4000ms | - |
| Overlay slide-up | 300ms | default |
| Progress bar | 75ms steps | linear |
