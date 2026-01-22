# Koku Travel Documentation

Documentation for the Koku Travel Japan travel planning application.

## Quick Start

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all tests
```

## Documentation Index

| File | Description |
|------|-------------|
| [tech-stack.md](./tech-stack.md) | Tech stack, project structure, commands, database |
| [architecture.md](./architecture.md) | React Query setup, column projections, location service patterns |
| [rules.md](./rules.md) | Development rules, known issues, testing patterns |
| [roadmap.md](./roadmap.md) | Pending features and future work |
| [archive/](./archive/) | Historical documentation of completed work |

## Key Directories

```
src/
├── app/api/           # API endpoints
├── components/        # React components (features/, ui/)
├── hooks/             # React Query hooks (central exports in index.ts)
├── lib/               # Utilities (supabase/, routing/, locations/)
├── services/          # Domain services (sync/, trip/)
└── types/             # TypeScript definitions
```

## Important Files

| File | Purpose |
|------|---------|
| `src/lib/supabase/projections.ts` | Column projections for database queries |
| `src/hooks/index.ts` | Central hook exports |
| `src/data/categoryHierarchy.ts` | Category/sub-type definitions for filtering |
| `src/lib/locations/locationService.ts` | Server-side location fetching |
| `src/data/cityInterests.json` | Pre-computed city-interest mapping (837 cities) |
| `src/lib/tripBuilder/cityRelevance.ts` | City relevance calculation utilities |

## Current Stats

- **Locations**: 2,586 (enriched with Google Places data)
- **API Tests**: 149 tests across 11 files
- **Explore Page Load**: ~500ms (94% faster after optimization)
