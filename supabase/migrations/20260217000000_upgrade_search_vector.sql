-- Upgrade from name-only search vector to composite search vector
-- covering name (A), category (B), and short_description (C).

-- 1. Drop the old name-only tsvector column and its GIN index
drop index if exists idx_locations_name_fts;
alter table locations drop column if exists name_search_vector;

-- 2. Create composite search_vector with weighted fields
alter table locations add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'C')
  ) stored;

-- 3. GIN index for fast full-text search
create index if not exists idx_locations_search_vector on locations using gin(search_vector);
