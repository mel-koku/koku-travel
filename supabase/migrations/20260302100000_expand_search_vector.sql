-- Expand search vector to include cuisine_type, description, tags, and insider_tip
-- so full-text search covers food-related terms like "kobe beef", "ramen", etc.

-- Immutable wrapper for array_to_string (required for generated columns)
create or replace function immutable_array_to_string(arr text[], sep text)
returns text language sql immutable as $$
  select array_to_string(arr, sep);
$$;

-- Drop existing column and recreate with expanded fields
alter table locations drop column if exists search_vector;

alter table locations add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(cuisine_type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(immutable_array_to_string(tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(insider_tip, '')), 'D')
  ) stored;

-- Recreate GIN index
drop index if exists idx_locations_search_vector;
create index idx_locations_search_vector on locations using gin(search_vector);
