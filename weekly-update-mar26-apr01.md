# Weekly Update: March 26 - April 1, 2026

## Highlights

Big week across performance, architecture, and content quality. Shipped 13 performance optimizations, completed the vibe system redesign, finished a major codebase refactoring pass, and hardened the tip/guidance system against fatigue and duplication.

---

## Performance Optimizations (13 commits)

Completed a full performance audit with prioritized fixes across high, medium, and low impact tiers:

- **Caching**: Added Redis caching to intent extraction and itinerary refinement endpoints; 6-hour in-memory cache on weather forecasts; LRU eviction on location cache; memoized photo URL resizing
- **Database**: Replaced `select("*")` with explicit column projections; added composite indexes for common query patterns; moved pricing rule date filtering to DB level; added RPC for filter metadata aggregation
- **Algorithmic**: Short-circuited scoring for locations with hard distance penalty; replaced O(n^2) diversity interleaving with O(n) round-robin; replaced N+1 filter loop with Map lookup in availability checks
- **Client**: Persisted entry point place details to Supabase (eliminates re-fetch); removed unused styled-components dependency
- **Search**: Added keyword shortcut map to skip inference for common search queries

## Vibe System Redesign

Removed 3 underperforming vibes (`neon_nightlife`, `pop_culture`, `artisan_craft`) and added 2 new ones (`modern_japan`, `art_architecture`). Updated all downstream systems:

- New vibe filter mappings and scoring weights
- Hidden gem scoring overhaul: +12 base for `local_secrets`, +3 for tag matches, -5 iconic penalty
- Seasonal scoring increased to +7
- Alias resolution for backward compatibility in API validation
- Updated intent extraction and chat tools for new vibe IDs
- Cleaned up all old vibe references across system prompts, tests, and docs

## Codebase Refactoring

Major decomposition pass on the three largest modules:

- **`itineraryGenerator.ts`**: Broken into focused sub-modules
- **`locationScoring.ts`**: Decomposed into individual factor modules
- **`gapDetection.ts`**: Split into focused detector modules
- Extracted shared filter utilities and Supabase active location helper into barrel exports
- Extracted duplicate utility functions into shared modules

## Tip System Hardening

Eliminated tip fatigue with a multi-layered dedup and capping system:

- Cross-tier dedup expanded from 4 to 11+ keyword groups (cash, rush hour, escalator, holidays, luggage, IC card, JR pass, last train, seasonal food, goshuin, festivals)
- Global cap: `MAX_TIPS_PER_DAY = 6` with priority sorting (pro tips first)
- Universal no-category tips capped to 2 on Day 1, 0 on Day 2+
- Category-based DB suppression (etiquette tips hidden when day has temples/shrines, food culture when day has restaurants)
- Archived 50+ generic/duplicate/low-priority travel guidance tips
- Fixed vibes passed to LLM prompts (was sending derived interests instead of actual vibes)

## Content & Tips Quality

- Extracted shared `useDayTipsCore` hook, eliminating ~380 lines of duplication between A and B variants
- Added JR Pass/transit pass guidance tip, escalator convention, train eating etiquette
- Broadened shoe removal tips across more categories with improved temple etiquette copy
- Surfaced insider tips on activity cards (A) and place detail pages
- Japan-specific copy replacements for generic activity tips (weather, payment, timing)
- Factual corrections: Meiji Jingu torii history, Naha last train time, Saihoji booking info
- Festival calendar: added `isApproximate` flag for shifting-date festivals

## Design System Compliance

- Migrated 8 remaining raw headings to `typography()` CVA system (ActivityCard, CapsuleHeader, EssentialsForm, LocationExpanded, RegionCard, RegionDetailPanel, ExperienceFooter, LocalExpertsShell, LinkedLocations, PlaceDetail)
- Replaced all remaining bare Tailwind shadows with `shadow-[var(--shadow-*)]` tokens
- Fixed PlaceDetail section spacing (missing `lg` breakpoint)

## Other Fixes & Features

- **Route optimization**: Pin last city near departure airport to prevent stranding travelers
- **Accommodation filtering**: Added `is_accommodation` column; filtered from trip builder, places, and filter-options
- **Daily quotas**: Per-user rate limits on expensive API endpoints (itinerary generation, refinement)
- **Experiences page**: Added "coming soon" page with nav link
- **City coverage**: Added 7 missing cities to city page data (Yakushima, Asahikawa, Kushiro, Abashiri, Wakkanai, Miyako, Amami)
- **Bug fixes**: Nested button hydration error, guide footer contrast, styled-components peer dependency restoration
- **Dead code removal**: `tripConverter.ts`, unused `styled-components`, redundant `tw-animate-css`
- **API hardening**: Wrapped `experiences/workshops` and `people/by-experience` routes in `withApiHandler`

---

## By the Numbers

| Metric                | Value                  |
| --------------------- | ---------------------- |
| Commits               | ~75                    |
| Performance fixes     | 13                     |
| Modules decomposed    | 3 major                |
| Vibes redesigned      | 5 (removed 3, added 2) |
| Tips archived         | 50+                    |
| Typography migrations | 10 components          |
| Active locations      | 6,245                  |
| DQ health score       | 94/100                 |
