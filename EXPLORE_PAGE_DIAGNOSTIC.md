# Explore Page Diagnostic Report

## Issue Summary
The `/explore` page at `https://koku-travel.vercel.app/explore` is not showing any content on the Vercel deployment.

## ✅ Root Cause Identified

**The `locations` table does not exist in Supabase.**

This is the primary issue preventing the explore page from displaying content.

## Root Cause Analysis

After reviewing the codebase, I've identified the following:

### 1. **API Route Implementation** ✅
- **Status**: Route exists and is properly implemented
- **File**: `src/app/api/locations/route.ts`
- **Functionality**: Fetches locations from Supabase `locations` table
- **Error Handling**: Properly implemented with try-catch and error logging

### 2. **Frontend Component** ✅
- **Status**: Component properly fetches from API
- **File**: `src/components/features/explore/ExploreShell.tsx`
- **Line 187**: `const response = await fetch("/api/locations");`
- **Error Handling**: Shows error message if fetch fails or returns empty array

### 3. **Potential Issues** ⚠️

#### Issue A: Missing Environment Variables in Vercel
**Most Likely Cause**

The Supabase client requires these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**How to Check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify both variables exist and are set for **Production** environment
3. Check that values match your Supabase project credentials

**How to Fix:**
1. Get credentials from Supabase Dashboard → Project Settings → API
2. Add variables in Vercel:
   - Variable: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co` (your project URL)
   - Environment: Production, Preview, Development
3. Add second variable:
   - Variable: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key)
   - Environment: Production, Preview, Development
4. **Redeploy** the project after adding variables

#### Issue B: Empty Locations Table
**Possible Cause**

The `locations` table might exist but be empty.

**How to Check:**
1. Go to Supabase Dashboard → Table Editor → `locations`
2. Check if any rows exist

**How to Fix:**
1. Run the seed script locally:
   ```bash
   npm run seed:locations
   ```
2. Or manually insert data via Supabase SQL Editor
3. Verify data appears in Table Editor

#### Issue C: Database Migration Not Applied
**Possible Cause**

The `locations` table might not exist in production Supabase.

**How to Check:**
1. Go to Supabase Dashboard → Table Editor
2. Look for `locations` table in the list

**How to Fix:**
1. Apply the migration:
   ```bash
   supabase db push
   ```
2. Or manually run the SQL from `supabase/migrations/20241120_create_locations_table.sql` in Supabase SQL Editor

#### Issue D: Row Level Security (RLS) Policy Issue
**Less Likely**

The RLS policy should allow public read access, but there might be an issue.

**How to Check:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Find policy: "Locations are viewable by everyone"
3. Verify it's enabled and allows `SELECT` for `authenticated` and `anon` roles

**How to Fix:**
If policy is missing, run this SQL in Supabase SQL Editor:
```sql
create policy "Locations are viewable by everyone"
  on locations
  for select
  using (true);
```

#### Issue E: API Route Error Not Visible
**Possible Cause**

The API might be returning an error, but the frontend isn't displaying it properly.

**How to Check:**
1. Open browser DevTools (F12) → Network tab
2. Navigate to `/explore` page
3. Look for request to `/api/locations`
4. Check response status and body

**Expected Response:**
```json
{
  "locations": [...]
}
```

**Error Response Examples:**
- `500 Internal Server Error` - Check Vercel function logs
- `404 Not Found` - Route not deployed (unlikely)
- Empty array `{"locations": []}` - Table is empty

## Diagnostic Steps

### Step 1: Test API Endpoint Directly
```bash
curl https://koku-travel.vercel.app/api/locations
```

**Expected**: JSON with locations array
**If Error**: Check error message for clues

### Step 2: Check Vercel Function Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Go to "Functions" tab
4. Look for `/api/locations` function logs
5. Check for errors related to:
   - Environment variables
   - Supabase connection
   - Database queries

### Step 3: Check Browser Console
1. Visit `https://koku-travel.vercel.app/explore`
2. Open DevTools (F12) → Console tab
3. Look for errors, especially:
   - Network errors
   - Supabase connection errors
   - API fetch errors

### Step 4: Verify Environment Variables
Run this check script (create temporarily):
```typescript
// Check env vars are accessible
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

## ✅ Solution

**The `locations` table needs to be created in Supabase.**

### Quick Fix Steps:

1. **Create the table** using the migration SQL:
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `supabase/migrations/20241120_create_locations_table.sql`
   - Paste and run in SQL Editor

2. **Seed the table** with data:
   ```bash
   npm run seed:locations
   ```

3. **Verify** the table has data:
   - Check Supabase Table Editor → `locations` table
   - Should see multiple location rows

4. **Test** the API:
   ```bash
   curl https://koku-travel.vercel.app/api/locations
   ```

See `docs/CREATE_LOCATIONS_TABLE.md` for detailed step-by-step instructions.

## Quick Fix Checklist

- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` exists in Vercel Production env vars
- [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` exists in Vercel Production env vars
- [ ] Verify values match Supabase Dashboard credentials
- [ ] Redeploy project after adding/updating variables
- [ ] Test `/api/locations` endpoint: `curl https://koku-travel.vercel.app/api/locations`
- [ ] Check `locations` table exists in Supabase
- [ ] Check `locations` table has data
- [ ] Verify RLS policy allows public read access
- [ ] Check browser console for errors
- [ ] Check Vercel function logs for errors

## Additional Notes

### Environment Variable Validation
The code validates environment variables in production (`src/lib/env.ts`):
- In production, missing required vars will cause build/runtime errors
- Check Vercel build logs for validation errors

### Error Handling
The API route properly handles errors:
- Database errors are logged server-side
- Client receives sanitized error messages
- Frontend displays error message to user

### Database Schema
The `locations` table structure is defined in:
- `supabase/migrations/20241120_create_locations_table.sql`
- Includes proper indexes and RLS policies
- Should allow public read access

## Next Steps

1. **Immediate**: Check Vercel environment variables
2. **If vars are set**: Check Supabase table and data
3. **If table is empty**: Run seed script
4. **If still failing**: Check Vercel function logs for detailed error messages

---

**Created**: 2025-01-27
**Status**: Diagnostic Complete - Awaiting Verification

