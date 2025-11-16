create extension if not exists "pgcrypto";

-- Table to store per-day entry points (start/end locations) for itinerary editing
create table if not exists day_entry_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id text not null,
  day_id text not null,
  start_point jsonb,
  end_point jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, trip_id, day_id)
);

-- Index for faster lookups by user and trip
create index if not exists idx_day_entry_points_user_trip 
  on day_entry_points(user_id, trip_id);

-- Index for faster lookups by day
create index if not exists idx_day_entry_points_day 
  on day_entry_points(day_id);

-- Function to update updated_at timestamp
create or replace function update_day_entry_points_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_day_entry_points_updated_at
  before update on day_entry_points
  for each row
  execute function update_day_entry_points_updated_at();

alter table day_entry_points enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users read own day entry points" on day_entry_points;
drop policy if exists "Users manage own day entry points" on day_entry_points;

-- Policy: Users can read their own day entry points
create policy "Users read own day entry points"
  on day_entry_points
  for select
  using (auth.uid() = user_id);

-- Policy: Users can manage (insert, update, delete) their own day entry points
create policy "Users manage own day entry points"
  on day_entry_points
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

