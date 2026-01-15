## Koku Travel

Koku Travel is a Next.js application that helps travelers discover curated guides, itineraries, and inspiration from local experts. The project uses Supabase for authentication and persistence.

## Prerequisites

- Node.js 18+
- npm 10+

## Environment Variables

Copy `env.local.example` to `.env.local` and populate the values:

```bash
cp env.local.example .env.local
```

Required keys:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase project credentials.
- `ROUTING_PROVIDER` / `ROUTING_MAPBOX_ACCESS_TOKEN` – Optional routing backend (set to `mapbox` with a valid token for precise travel times). Leave unset to fall back to heuristic estimates.

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
- `src/data` – Mock data and static content.
- `docs` – Project documentation.

## Getting Help

Open an issue or start a discussion in the repository when you need support or want to propose changes.
