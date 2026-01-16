# Scripts Directory

This directory contains utility scripts for data management, maintenance, and development tasks.

## Script Categories

### Active Maintenance Scripts

These scripts are actively used for ongoing maintenance and data management:

#### Data Seeding
- **`seed-locations.ts`** - Populates the locations table with mock or scraped data
  - Usage: `npm run seed:locations` (mock data) or `npm run seed:scraped` (scraped data)
  - Requires: `SUPABASE_SERVICE_ROLE_KEY`

#### Data Scraping
- **`scrapers/run-all-scrapers.ts`** - Orchestrates all regional scrapers
  - Usage: `npm run scrape:all`
  - Runs all 8 regional DMO scrapers sequentially

- **`scrapers/*-scraper.ts`** - Regional location scrapers
  - Individual scrapers for: Hokkaido, Tohoku, Central Japan, Kansai, Chugoku, Shikoku, Kyushu, Okinawa
  - Usage: `npm run scrape:<region>` (e.g., `npm run scrape:hokkaido`)

#### Data Enrichment
- **`enrich-scraped-data.ts`** - Enriches scraped location data with additional metadata
  - Usage: `npm run enrich:scraped`

- **`fetch-google-descriptions.ts`** - Fetches descriptions from Google Places API
- **`generate-simple-descriptions.ts`** - Generates simple descriptions for locations
- **`update-descriptions.ts`** - Updates location descriptions in database
- **`update-location-names.ts`** - Updates location names in database

#### Data Validation & Cleanup
- **`check-invalid-place-ids.ts`** - Validates place IDs in the database
- **`check-locations-count.ts`** - Checks location counts by region/category
- **`cleanup-locations.ts`** - Cleans up invalid or duplicate locations
- **`cleanup-orphan-cache.ts`** - Cleans up orphaned cache entries
- **`remove-no-placeid.ts`** - Removes locations without place IDs

#### Data Processing
- **`batch-geocode-locations.ts`** - Batch geocodes locations
  - Usage: `npm run geocode:locations`

- **`evaluate-scoring.ts`** - Evaluates location scoring algorithms
  - Usage: `npm run evaluate:scoring`

- **`find-non-tourist.ts`** - Identifies non-tourist locations

#### Data Fixes
- **`fix-japanese-names.ts`** - Fixes Japanese location names
- **`fix-remaining-descriptions.ts`** - Fixes remaining location descriptions

#### Testing & Development
- **`clean-test-data.ts`** - Cleans up test data
  - Usage: `npm run clean:test-data`

#### Git Maintenance
- **`batch-merge-dependabot.sh`** - Batch merges Dependabot PRs
- **`cleanup-branches.sh`** - Cleans up merged branches

#### Data Deletion (Use with caution)
- **`delete-all-locations.ts`** - Deletes all locations from database (⚠️ DESTRUCTIVE)

### Archived Scripts

These scripts have been moved to `archive/` as they were one-time debugging/migration tools:

- **`archive/debug-desc-match.ts`** - Debug script for matching descriptions (one-time use)
- **`archive/debug-ids.ts`** - Debug script for ID matching (one-time use)
- **`archive/debug-hokkaido.ts`** - Debug script for Hokkaido scraper (one-time use)

## Script Requirements

Most scripts require:
- Node.js 18+
- TypeScript execution via `tsx`
- Environment variables from `.env.local`:
  - `SUPABASE_SERVICE_ROLE_KEY` (for database operations)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `GOOGLE_PLACES_API_KEY` (for Google Places operations)

## Running Scripts

### Via npm scripts (recommended)
```bash
npm run <script-name>
```

### Direct execution
```bash
npx tsx scripts/<script-name>.ts
```

## Adding New Scripts

When adding new scripts:
1. Add appropriate JSDoc comments at the top explaining purpose and usage
2. Include error handling and validation
3. Add to `package.json` scripts if it's a commonly used operation
4. Document in this README
5. Use TypeScript with proper types
6. Load environment variables using `dotenv` if needed

## Notes

- Scripts in `archive/` are kept for reference but are not actively maintained
- Scraped data outputs are saved to `tmp/` directory (gitignored)
- Always test scripts on development data before running on production
- Database modification scripts should include confirmation prompts for destructive operations
