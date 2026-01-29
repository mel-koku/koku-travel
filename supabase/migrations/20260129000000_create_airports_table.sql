-- Create airports table for storing Japanese airports
-- Used for trip entry point selection

create table if not exists airports (
  id text primary key,                    -- lowercase IATA code (e.g., 'nrt')
  iata_code text not null unique,         -- 3-letter IATA code (e.g., 'NRT')
  name text not null,                     -- Full name
  name_ja text,                           -- Japanese name
  short_name text not null,               -- Display name (e.g., 'Narita (NRT)')
  city text not null,
  region text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  is_international boolean default false,
  is_popular boolean default false,       -- For quick pick chips
  created_at timestamptz default now()
);

-- Index for full-text search on name, city, and IATA code
create index idx_airports_search on airports
  using gin(to_tsvector('english', name || ' ' || city || ' ' || iata_code));

-- Index for filtering popular airports
create index idx_airports_popular on airports(is_popular) where is_popular = true;

-- Enable Row Level Security
alter table airports enable row level security;

-- Public read access policy
create policy "Airports are public" on airports for select using (true);
