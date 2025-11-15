# Creating the Locations Table in Supabase

This guide will help you create the `locations` table and populate it with data so the `/explore` page works.

## Option 1: Using Supabase SQL Editor (Recommended - Easiest)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Migration SQL
1. Copy the entire contents of `supabase/migrations/20241120_create_locations_table.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
4. You should see: "Success. No rows returned"

### Step 3: Verify Table Creation
1. Go to **Table Editor** in the left sidebar
2. You should now see the `locations` table
3. It should be empty (no rows yet)

### Step 4: Seed the Table with Data
Run the seed script locally:

```bash
# Make sure you have your .env.local file with Supabase credentials
npm run seed:locations
```

This will populate the table with mock location data.

---

## Option 2: Using Supabase CLI (If You Have It Set Up)

### Step 1: Link Your Project (if not already linked)
```bash
supabase link --project-ref your-project-ref
```

### Step 2: Push the Migration
```bash
npm run supabase:db:push
```

This will apply all migrations in the `supabase/migrations/` folder.

### Step 3: Seed the Table
```bash
npm run seed:locations
```

---

## Option 3: Manual SQL Execution (If Options 1 & 2 Don't Work)

### Step 1: Create the Table
Copy and paste this SQL into Supabase SQL Editor:

```sql
-- Create locations table for storing location data
create table if not exists locations (
  id text primary key,
  name text not null,
  region text not null,
  city text not null,
  category text not null,
  image text not null,
  min_budget text,
  estimated_duration text,
  operating_hours jsonb,
  recommended_visit jsonb,
  preferred_transit_modes text[],
  coordinates jsonb,
  timezone text,
  short_description text,
  rating numeric(3, 2),
  review_count integer,
  place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for common queries
create index if not exists idx_locations_region on locations(region);
create index if not exists idx_locations_city on locations(city);
create index if not exists idx_locations_category on locations(category);
create index if not exists idx_locations_rating on locations(rating desc nulls last);

-- Enable RLS (Row Level Security)
alter table locations enable row level security;

-- Allow public read access to locations
create policy "Locations are viewable by everyone"
  on locations
  for select
  using (true);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_locations_updated_at
  before update on locations
  for each row
  execute function update_updated_at_column();
```

### Step 2: Verify Table Created
- Go to **Table Editor** → Check for `locations` table

### Step 3: Seed Data
Run the seed script:
```bash
npm run seed:locations
```

---

## Verifying the Setup

### Check Table Exists
1. Go to Supabase Dashboard → Table Editor
2. You should see `locations` table in the list

### Check Data Exists
1. Click on the `locations` table
2. You should see rows of location data
3. If empty, run: `npm run seed:locations`

### Test the API
After seeding, test locally:
```bash
# Start dev server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/locations
```

Or test on Vercel:
```bash
curl https://koku-travel.vercel.app/api/locations
```

---

## Troubleshooting

### Error: "relation 'locations' does not exist"
- The table wasn't created. Try running the SQL again in SQL Editor.

### Error: "permission denied for table locations"
- RLS policy might not be set correctly. Run the policy creation SQL again.

### Seed Script Fails
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local`
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase dashboard → Project Settings → API → Service Role Key

### Table Created But No Data
- Run the seed script: `npm run seed:locations`
- Check seed script output for errors
- Verify service role key has write permissions

---

## Next Steps

After creating the table and seeding data:
1. ✅ Table should exist in Supabase
2. ✅ Table should have location data
3. ✅ Test `/api/locations` endpoint
4. ✅ Visit `/explore` page - it should now show locations!

---

**Quick Reference:**
- Migration file: `supabase/migrations/20241120_create_locations_table.sql`
- Seed script: `scripts/seed-locations.ts`
- Run seed: `npm run seed:locations`

