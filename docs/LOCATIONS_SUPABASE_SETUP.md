# Locations Supabase Setup Guide

This guide explains how to set up the locations table in Supabase and populate it with data for the `/explore` page.

## Overview

The `/explore` page now fetches locations from Supabase instead of using mock data. To make this work in production, you need to:

1. Run the database migration to create the `locations` table
2. Seed the database with location data
3. Ensure environment variables are configured in Vercel

## Step 1: Run Database Migration

The migration file `supabase/migrations/20241120_create_locations_table.sql` creates the `locations` table with proper indexes and RLS policies.

### Option A: Using Supabase CLI (Recommended)

If you have Supabase CLI set up:

```bash
supabase db push
```

### Option B: Manual Migration

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20241120_create_locations_table.sql`
4. Run the SQL script

## Step 2: Seed the Database

After the migration is complete, populate the `locations` table with data:

```bash
npm run seed:locations
```

This script will:
- Check if locations already exist (skips if found)
- Insert all locations from `MOCK_LOCATIONS` into Supabase
- Process in batches of 100 to avoid overwhelming the database

**Note:** Make sure you have `SUPABASE_SERVICE_ROLE_KEY` set in your environment variables for the seed script to work.

## Step 3: Verify Environment Variables in Vercel

Ensure these environment variables are set in your Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (sensitive, server-side only)

To check/update:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all three variables are set
3. Make sure they're available for Production, Preview, and Development environments

## Step 4: Verify the Setup

After deployment:

1. Visit `/explore` page
2. Check browser console for any errors
3. Verify locations are loading from Supabase

If locations don't appear:
- Check Vercel function logs for API errors
- Verify the `locations` table exists in Supabase
- Check that RLS policies allow public read access
- Ensure environment variables are correctly set

## Troubleshooting

### No locations showing on `/explore`

1. **Check API route**: Visit `/api/locations` directly - should return JSON with locations array
2. **Check Supabase**: Verify table exists and has data
3. **Check RLS**: Ensure the "Locations are viewable by everyone" policy is active
4. **Check logs**: Look at Vercel function logs for errors

### Migration fails

- Ensure you have proper permissions in Supabase
- Check that the table doesn't already exist
- Verify SQL syntax is correct

### Seed script fails

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check that migration has been run first
- Ensure network connectivity to Supabase

## API Endpoint

The new API endpoint `/api/locations`:
- Returns all locations from Supabase
- Includes caching headers (5 minutes)
- Transforms database rows to Location type
- Handles errors gracefully

## Database Schema

The `locations` table includes:
- Basic info: `id`, `name`, `region`, `city`, `category`, `image`
- Optional fields: `min_budget`, `estimated_duration`, `operating_hours`, `recommended_visit`, etc.
- JSONB fields for complex data structures
- Indexes on commonly queried fields
- RLS enabled with public read access

## Next Steps

After setup:
- Locations will be served from Supabase
- You can update locations directly in Supabase
- Consider adding an admin interface for managing locations
- Monitor API performance and caching effectiveness

