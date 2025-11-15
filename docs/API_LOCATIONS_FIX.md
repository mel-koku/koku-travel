# Fix: /api/locations Route Not Found

## Issue
The `/api/locations` endpoint was returning 404 on the live Vercel deployment.

## Root Cause
The route file `src/app/api/locations/route.ts` existed locally but was **untracked in git**, so it wasn't being deployed to Vercel.

## Solution Applied
✅ Added the route file to git  
✅ Committed the file  
✅ Ready to push and deploy

## Next Steps

### 1. Push to GitHub
```bash
git push origin main
```

This will trigger an automatic Vercel deployment.

### 2. Verify Deployment
After Vercel finishes deploying:

1. **Test the endpoint:**
   ```bash
   curl https://your-project.vercel.app/api/locations
   ```

2. **Expected response:**
   ```json
   {
     "locations": [...]
   }
   ```

3. **Check health endpoint:**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
   Should show Supabase as healthy.

### 3. Verify in Browser
- Visit your live site
- Navigate to the Explore page (which uses `/api/locations`)
- Verify locations load correctly

## Related Files

The route file connects to:
- **Database:** Supabase `locations` table
- **Frontend:** `src/components/features/explore/ExploreShell.tsx` (line 187)
- **Type:** `src/types/location.ts`

## Additional Notes

### Other Untracked Files
You also have these untracked files that may need to be committed:
- `scripts/seed-locations.ts` - Script for seeding locations
- `supabase/migrations/20241120_create_locations_table.sql` - Database migration

**Recommendation:** Commit these as well if they're ready:
```bash
git add scripts/seed-locations.ts supabase/migrations/20241120_create_locations_table.sql
git commit -m "Add locations seeding script and migration"
git push origin main
```

### Database Setup
Make sure the `locations` table exists in your Supabase database:
- Run the migration: `supabase db push`
- Or apply manually in Supabase dashboard

---

**Status:** ✅ Fixed - Ready to deploy  
**Commit:** `f6055c6` - "Add /api/locations route for fetching locations from Supabase"

