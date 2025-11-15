# Quick Fix: Create Locations Table

## Problem
The `/explore` page shows no content because the `locations` table doesn't exist in Supabase.

## Solution (5 minutes)

### Step 1: Create the Table (2 min)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Open the file: `supabase/migrations/20241120_create_locations_table.sql`
5. Copy ALL the SQL code
6. Paste into SQL Editor
7. Click **Run** (or press `Ctrl+Enter`)

✅ You should see: "Success. No rows returned"

### Step 2: Verify Table Created (30 sec)

1. Click **Table Editor** (left sidebar)
2. Look for `locations` table in the list
3. Click on it - it should be empty (no rows yet)

### Step 3: Seed with Data (2 min)

Run this command in your terminal:

```bash
npm run seed:locations
```

This will populate the table with location data.

**Note:** Make sure your `.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Verify Data (30 sec)

1. Go back to Supabase → Table Editor → `locations`
2. You should now see rows of location data
3. If empty, check the terminal output from seed script for errors

### Step 5: Test (30 sec)

Test the API endpoint:

```bash
curl https://koku-travel.vercel.app/api/locations
```

Or visit: https://koku-travel.vercel.app/explore

---

## Troubleshooting

### "relation 'locations' does not exist"
→ Table wasn't created. Run the SQL again.

### Seed script fails with "permission denied"
→ Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly in `.env.local`

### Table exists but empty
→ Run `npm run seed:locations` again

### Still not working?
→ Check Vercel environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

**That's it!** After these steps, your `/explore` page should show locations.

