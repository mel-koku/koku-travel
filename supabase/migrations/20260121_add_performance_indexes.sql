-- Migration: Add performance indexes for common query patterns
-- Created: 2026-01-21

-- =============================================================================
-- 1. Full-text search index on name
-- Enables fast text search queries using PostgreSQL's full-text search
-- =============================================================================

-- Add a generated tsvector column for full-text search
alter table locations add column if not exists name_search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name, ''))) stored;

-- Create GIN index on the tsvector column for fast full-text search
create index if not exists idx_locations_name_fts on locations using gin(name_search_vector);

-- Also add trigram index for fuzzy/partial matching (requires pg_trgm extension)
-- This enables LIKE '%pattern%' queries to use the index
create extension if not exists pg_trgm;
create index if not exists idx_locations_name_trigram on locations using gin(name gin_trgm_ops);

-- =============================================================================
-- 2. Geographic index for coordinate-based queries (nearby search)
-- Enables fast geographic queries using PostGIS or coordinate-based lookups
-- =============================================================================

-- Extract lat/lng as separate columns for indexing (coordinates is JSONB)
-- This is more efficient than indexing the JSONB directly for range queries
alter table locations add column if not exists lat double precision;
alter table locations add column if not exists lng double precision;

-- Update existing records to populate lat/lng from coordinates JSONB
update locations
set
  lat = (coordinates->>'lat')::double precision,
  lng = (coordinates->>'lng')::double precision
where coordinates is not null
  and coordinates->>'lat' is not null
  and coordinates->>'lng' is not null
  and lat is null;

-- Create B-tree indexes for range queries on coordinates
create index if not exists idx_locations_lat on locations(lat) where lat is not null;
create index if not exists idx_locations_lng on locations(lng) where lng is not null;

-- Create a composite index for bounding box queries (nearby search)
create index if not exists idx_locations_coords on locations(lat, lng)
  where lat is not null and lng is not null;

-- =============================================================================
-- 3. Composite index for Explore page filters
-- Optimizes queries that filter by region, category, and check place_id existence
-- =============================================================================

create index if not exists idx_locations_explore_filters
  on locations(region, category)
  where place_id is not null and place_id != '';

-- =============================================================================
-- 4. Composite index for cities aggregation
-- Optimizes GROUP BY city, region queries used by the cities endpoint
-- =============================================================================

create index if not exists idx_locations_city_region on locations(city, region);

-- =============================================================================
-- 5. Partial index for locations with reviews (used for sorting/filtering)
-- =============================================================================

create index if not exists idx_locations_with_reviews
  on locations(rating desc nulls last, review_count desc nulls last)
  where rating is not null and review_count is not null and review_count > 0;

-- =============================================================================
-- Add trigger to automatically update lat/lng when coordinates change
-- =============================================================================

create or replace function update_location_coordinates()
returns trigger as $$
begin
  if new.coordinates is not null and new.coordinates->>'lat' is not null and new.coordinates->>'lng' is not null then
    new.lat := (new.coordinates->>'lat')::double precision;
    new.lng := (new.coordinates->>'lng')::double precision;
  else
    new.lat := null;
    new.lng := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_location_coordinates_trigger on locations;
create trigger update_location_coordinates_trigger
  before insert or update of coordinates on locations
  for each row
  execute function update_location_coordinates();
