# Koku Travel - Weekly Update (Mar 22-26)

## Design System Overhaul

- **Font swap**: Replaced Instrument Serif + Playfair Display with **Cormorant + Plus Jakarta Sans** as the Variant A type system
- **Typography system**: Migrated raw `font-serif` headings to CVA-based `typography()` system across the app
- **Eased scrims**: Replaced linear image gradient overlays with 8-stop oklab eased `.scrim-{opacity}` utilities
- **Shadow tokens**: Standardized overlay contrast tiers across landing sections
- Removed CustomCursor, streamlined motion system

## Landing Page

- Rewrote **FeaturedLocations** from horizontal scroll to grid layout
- Conversion-focused landing audit (CTAs, copy, section spacing)
- Unified typography scale, ScrollReveal defaults, animation system

## Trip Builder

- Full typography normalization
- **EntryPoint map** made full-bleed flush to header
- Replaced photo-overlay vibe cards with clean icon cards
- Region step: removed city dots, smaller sans-serif city names, hover delay fix
- **Hard city caps** with Japan travel expert nudges
- **Auto-select recommended city count** in region step
- Review step cleanup, bottom nav centering fixes

## Places Page

- Rewrote grid as 4-column card layout aligned with Variant B
- Category bar alignment, seasonal banner refinements
- **Smart query parser** for search (natural language queries)
- Filter panel "clear all" fix, interleaved category sort to prevent dining clusters
- Map card list synced with visible pins + hover highlight
- Quick plan panel: image shift fix, auto-scroll on open

## Itinerary

- **Redesigned activity cards** and compact UI elements
- Day selector converted from chips to dropdown, single-row toolbar
- **Editorial guide layout** with inline location cards + save buttons + slide-out detail panel
- DnD scroll-behind-header fix, day header declutter
- Airport cards, expandable text, tip dismissal polish

## Scoring & Intelligence

- **Rebalanced scoring** to prioritize user preferences over popularity
- **Contextual distance threshold** (extends 50km to 75km for nature+relaxed trips)
- **Hidden gem scoring** improvements (rating floor, two-layer bonus)
- Return-to-airport detection now uses travel matrix instead of crow-flies

## Day Trip Suggestions (New Feature)

- **Suggest API**: Finds locations 50-150km from planned cities, scores by vibe/rating/badges
- **Plan API**: Builds 2-3 activity day with real routed travel times (Google Directions)
- DayTripBanner on timeline, DayTripSection in dashboard, DayTripNudge toast
- Undo support (Cmd+Z restores swapped day)

## Data & Infrastructure

- Expanded planning cities from 35 to 42 (Hokkaido, Okinawa, Yakushima)
- **UNESCO World Heritage** import (216 locations, 26 designations) with badge, filter, scoring
- Duplicate cleanup, data quality health updates
- Guide prose wired from API through to guide builder
- Variant B city-exceeds-days validation fix
- Hid local experts and experiences features for private testing
