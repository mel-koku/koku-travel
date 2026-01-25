create extension if not exists "pgcrypto";

create table if not exists place_details (
  location_id text not null,
  place_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (location_id)
);

create index if not exists idx_place_details_location_id on place_details(location_id);
create index if not exists idx_place_details_fetched_at on place_details(fetched_at);

-- This table is accessed via service role only for caching purposes
-- No RLS policies needed as it's server-side only

