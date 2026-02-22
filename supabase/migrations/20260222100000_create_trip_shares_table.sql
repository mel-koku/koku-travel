-- Migration: Create trip_shares table for shareable itinerary links
-- Users can generate a public share link for their trip; anyone with the link
-- can view a read-only version of the itinerary.

create table if not exists trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique,
  is_active boolean not null default true,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookup by active token (public share endpoint)
create unique index if not exists idx_trip_shares_active_token
  on trip_shares(share_token) where is_active = true;

-- User + trip lookup (owner share management)
create index if not exists idx_trip_shares_user_trip
  on trip_shares(user_id, trip_id);

-- Enable Row Level Security
alter table trip_shares enable row level security;

-- Policy: Users can manage (read/insert/update/delete) their own shares
create policy "Users can manage own shares"
  on trip_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
