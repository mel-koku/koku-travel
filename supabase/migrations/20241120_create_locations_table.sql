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

