# Migration Guide: Moving Guides and Authors to Sanity

This guide explains how to migrate all guides and authors from hardcoded data to Sanity CMS.

## Overview

The migration script (`scripts/sanity/migrate-all-content.mjs`) will:
1. Extract all guides from `src/lib/sanity/guides.ts` (FALLBACK_GUIDES) and `src/data/mockExperts.ts`
2. Extract all unique authors from the guides and mock experts data
3. Upload author images and create author documents in Sanity
4. Upload guide images and create guide documents in Sanity with proper author references

## Prerequisites

1. Ensure you have a `.env.local` file with the following Sanity environment variables:
   - `SANITY_PROJECT_ID`
   - `SANITY_DATASET`
   - `SANITY_API_WRITE_TOKEN`
   - `SANITY_API_VERSION`

2. Make sure your Sanity project has the `author` and `guide` schema types configured (they should already be set up).

## Running the Migration

1. Run the migration script:
   ```bash
   node scripts/sanity/migrate-all-content.mjs
   ```

2. The script will:
   - Show progress for each author and guide being created
   - Upload images from URLs to Sanity
   - Create or update documents (using `createOrReplace` to handle duplicates)
   - Display a summary at the end

3. Verify the migration:
   - Open Sanity Studio at `/studio`
   - Check that all authors are present
   - Check that all guides are present and properly linked to authors

## After Migration

Once you've confirmed all content is successfully migrated to Sanity:

1. **Remove fallback guides** (optional, for cleaner code):
   - Open `src/lib/sanity/guides.ts`
   - Remove the `FALLBACK_GUIDES` constant
   - Update `fetchGuides()` to return only Sanity guides (remove the merge logic)
   - Update `fetchGuideBySlug()` to return `null` when guide is not found in Sanity (remove fallback lookup)

2. **Remove mock experts** (optional, if no longer needed):
   - If `src/data/mockExperts.ts` is only used for guides/authors, you can remove it
   - Check if it's used elsewhere before deleting

## Troubleshooting

- **Image upload failures**: The script will continue even if some images fail to upload. Check the console output for specific errors.
- **Duplicate documents**: The script uses `createOrReplace`, so running it multiple times is safe.
- **Missing authors**: If a guide references an author that doesn't exist, the script will skip that guide and log an error.

## Notes

- The script deduplicates guides by slug, so guides from both `FALLBACK_GUIDES` and `mockExperts.ts` will be merged
- Author data from `MOCK_EXPERTS` takes precedence over data extracted from guides
- Images are uploaded to Sanity's asset storage, so external URLs are no longer needed

