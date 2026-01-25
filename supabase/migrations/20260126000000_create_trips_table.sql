-- Migration: Create trips table for itinerary persistence
-- This table stores user-created trips with their itinerary and builder data

create extension if not exists "pgcrypto";

-- Create trips table
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled itinerary',
  itinerary jsonb not null default '{"days": []}',
  builder_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,  -- Soft delete support
  version integer not null default 1
);

-- Index for user's trips lookup
create index if not exists idx_trips_user_id on trips(user_id);

-- Index for fetching user's active trips sorted by update time
create index if not exists idx_trips_user_updated on trips(user_id, updated_at desc) where deleted_at is null;

-- Function to update updated_at timestamp and increment version
create or replace function update_trips_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at and version
create trigger update_trips_updated_at
  before update on trips
  for each row
  execute function update_trips_updated_at();

-- Enable Row Level Security
alter table trips enable row level security;

-- Drop existing policies if they exist (for idempotent migrations)
drop policy if exists "Users read own trips" on trips;
drop policy if exists "Users create own trips" on trips;
drop policy if exists "Users update own trips" on trips;
drop policy if exists "Users delete own trips" on trips;

-- Policy: Users can only read their own trips
create policy "Users read own trips"
  on trips
  for select
  using (auth.uid() = user_id);

-- Policy: Users can only create trips for themselves
create policy "Users create own trips"
  on trips
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can only update their own trips
create policy "Users update own trips"
  on trips
  for update
  using (auth.uid() = user_id);

-- Policy: Users can only delete their own trips
create policy "Users delete own trips"
  on trips
  for delete
  using (auth.uid() = user_id);
