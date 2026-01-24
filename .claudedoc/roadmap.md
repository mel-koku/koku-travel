# Roadmap

## Pending Features

### Featured Destinations Manual Curation
Currently, the Featured Destinations carousel on the explore page is auto-populated using a popularity score algorithm (Bayesian weighted average of rating + review count).

**To enable manual curation:**
1. Run migration: `supabase/migrations/20260124_add_is_featured_column.sql`
2. In `src/lib/supabase/projections.ts`:
   - Add `is_featured` to `LOCATION_LISTING_COLUMNS`
   - Add `is_featured` to `LocationListingDbRow` type
3. In `src/app/api/locations/route.ts`:
   - Add `isFeatured: row.is_featured ?? undefined` to the mapping
4. Update `featuredLocations` filter in `ExploreShell.tsx` to check `isFeatured === true`
5. Mark locations as featured in database: `UPDATE locations SET is_featured = true WHERE id = '...'`

## Completed Work

See [archive/completed-2026-01.md](./archive/completed-2026-01.md) for all completed features from January 2026.
