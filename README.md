## Yuku Japan

Yuku Japan is a Next.js application that helps travelers discover curated guides, itineraries, and inspiration from local experts. The project uses Supabase for authentication and persistence.

## Prerequisites

- Node.js 18+
- npm 10+

## Environment Variables

Copy `.env.example` to `.env.local` and populate the values:

```bash
cp .env.example .env.local
```

See `.env.example` for the complete list with descriptions. At minimum, the production build requires:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase project credentials (reads and auth).
- `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` – Sanity CMS config. Required for sitemap generation and Sanity-backed content. If absent, `src/sanity/client.ts` falls back to placeholder values so imports do not throw, and Sanity queries return empty arrays (see `experienceService.ts` try/catch pattern).

Optional but commonly set:

- `ROUTING_PROVIDER` / `ROUTING_MAPBOX_ACCESS_TOKEN` / `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` – routing and client-side map rendering. Leave unset to fall back to heuristic estimates.
- `NEXT_PUBLIC_MAPBOX_STYLE_URL` – override the default Mapbox style URL consumed by all map components via `env.mapboxStyleUrl` (`src/lib/env.ts`). Useful when rotating Mapbox accounts or swapping branded styles without a code change.
- `SENTRY_AUTH_TOKEN` – build-time Organization Auth Token for uploading sourcemaps. Must be issued by the current Sentry org (the slug is baked into the token and cannot be overridden at runtime).
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` – service account JSON (minified, single line) for Vertex AI; powers LLM-backed itinerary refinement passes. Also set `GOOGLE_VERTEX_PROJECT` and `GOOGLE_VERTEX_LOCATION`.

## Itinerary Planner & Map Highlights

- `src/lib/itineraryPlanner.ts` assembles day schedules by combining recommended visit durations, opening hours, and travel times. It defaults to heuristic estimates but will call the configured routing provider when credentials are present.
- `src/lib/routing/` encapsulates routing providers and in-memory caching. Provide a Mapbox token to unlock richer directions; otherwise the planner supplies estimated timings.
- The itinerary map now links marker clicks to the activity timeline (and vice versa) so travelers can orient themselves quickly. Travel segments and leave-by guidance appear directly on each activity card.

## Scripts

```bash
npm run dev      # start Next.js in development mode
npm run build    # create a production build
npm run start    # serve the production build
npm run lint     # run ESLint
npm run test     # run Vitest suite (includes itinerary planner coverage)
```

## Folder Structure

- `src/app` – Next.js App Router pages and layouts.
- `src/components` – Reusable UI and feature components.
- `src/state` – Global state containers.
- `src/data` – Static content and mock data.
  - `src/data/mocks/` – Mock data files (locations, itineraries, community topics).
- `src/lib` – Utility functions and services.
  - `src/lib/storageHelpers.ts` – Unified localStorage utilities.
  - `src/lib/constants/` – Application constants (time, rate limits, sizes).
- `docs` – Project documentation.

## Code Organization

- **Storage Helpers**: Unified localStorage utilities in `src/lib/storageHelpers.ts` are used by domain-specific wrappers (wishlist, community, app state).
- **Mock Data**: Mock data files are organized in `src/data/mocks/` subdirectory.
- **Code Splitting**: Trip builder steps use dynamic imports for optimal bundle size.
- **Type Safety**: TypeScript strict mode enabled with unused variable/parameter checks.

## Getting Help

Open an issue or start a discussion in the repository when you need support or want to propose changes.
