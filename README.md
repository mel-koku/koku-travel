## Koku Travel

Koku Travel is a Next.js application that helps travelers discover curated guides, itineraries, and inspiration from local experts. The project currently uses Supabase for authentication and persistence, and we are integrating Sanity as the headless CMS for editorial content.

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
- `SANITY_PROJECT_ID` / `SANITY_DATASET` – Sanity project identifiers.
- `SANITY_API_READ_TOKEN` – Read token scoped for frontend data fetching.
- `SANITY_API_WRITE_TOKEN` – Write token used by local import scripts (optional).
- `SANITY_PREVIEW_SECRET` – Random string used to secure Next.js preview routes.
- `SANITY_API_VERSION` – Optional override for the Sanity API version (defaults to `2024-10-21`).
- `SANITY_REVALIDATE_SECRET` – Secret shared with Sanity webhooks for ISR revalidation.
- `ROUTING_PROVIDER` / `ROUTING_MAPBOX_ACCESS_TOKEN` – Optional routing backend (set to `mapbox` with a valid token for precise travel times). Leave unset to fall back to heuristic estimates.

## Itinerary Planner & Map Highlights

- `src/lib/itineraryPlanner.ts` assembles day schedules by combining recommended visit durations, opening hours, and travel times. It defaults to heuristic estimates but will call the configured routing provider when credentials are present.
- `src/lib/routing/` encapsulates routing providers and in-memory caching. Provide a Mapbox token to unlock richer directions; otherwise the planner supplies estimated timings.
- The itinerary map now links marker clicks to the activity timeline (and vice versa) so travelers can orient themselves quickly. Travel segments and leave-by guidance appear directly on each activity card.

Refer to `docs/sanity-setup.md` for detailed instructions on provisioning the Sanity project and tokens.

## Scripts

```bash
npm run dev      # start Next.js in development mode
npm run build    # create a production build
npm run start    # serve the production build
npm run lint     # run ESLint
npm run test     # run Vitest suite (includes itinerary planner coverage)
npm run sanity:dev # (after setup) run Sanity Studio local server
```

The embedded Sanity Studio is available at `http://localhost:3000/studio` when `npm run dev` is running.

### Preview & Revalidation

- Enable preview mode with `https://localhost:3000/api/preview?secret=...&slug=/guides`.
- Exit preview via `https://localhost:3000/api/preview/exit`.
- Configure a Sanity webhook to `POST https://localhost:3000/api/revalidate` with the same secret to refresh ISR cache after content changes.

### Seeding Sample Content

Run the guide seeding script after setting a `SANITY_API_WRITE_TOKEN` with write access:

```bash
npm run sanity:seed:guides
```

The script uploads three starter guides and reuses existing image assets when re-run.

## Folder Structure

- `src/app` – Next.js App Router pages and layouts.
- `src/components` – Reusable UI and feature components.
- `src/state` – Global state containers.
- `src/data` – Temporary mock data (to be replaced by Sanity content).
- `docs` – Project documentation such as Sanity setup guides.

## Getting Help

Open an issue or start a discussion in the repository when you need support or want to propose changes. Pull requests should include links to any relevant design documents or Sanity schema updates.
