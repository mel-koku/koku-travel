# Koku Travel

Japan travel planning app built with **Next.js 16**, **TypeScript**, **Supabase**, and **Tailwind CSS**.

## Quick Start

```bash
npm run dev      # Development server
npm run build    # Production build
npm test         # Run tests
```

## Documentation

Detailed documentation in `.claudedoc/`:

| File | Description |
|------|-------------|
| [README.md](.claudedoc/README.md) | Master index and quick reference |
| [tech-stack.md](.claudedoc/tech-stack.md) | Tech stack, project structure, commands, database |
| [architecture.md](.claudedoc/architecture.md) | React Query, column projections, location service |
| [style-guide.md](.claudedoc/style-guide.md) | Design system: colors, typography, patterns |
| [rules.md](.claudedoc/rules.md) | Development rules, known issues, testing |
| [roadmap.md](.claudedoc/roadmap.md) | Pending features |
| [archive/](.claudedoc/archive/) | Completed feature history |

## Key Patterns

1. **Column projections** - Use `src/lib/supabase/projections.ts`, never `.select("*")`
2. **React Query** - Server state via hooks in `src/hooks/`
3. **Server/client boundary** - Server: `locationService.ts`, Client: API + React Query
4. **Category hierarchy** - `src/data/categoryHierarchy.ts` for filtering

## Current Stats

- **2,586 locations** enriched with Google Places data and AI-generated descriptions
- **479 tests** across 36 test files (shared utilities in `tests/utils/`)
- **~500ms** explore page load (94% faster after optimization)
