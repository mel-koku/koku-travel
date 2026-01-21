-- Add index on place_id for efficient duplicate checking
-- This index is used by scrapers to quickly check if a location already exists
-- based on Google Places API place_id

create index if not exists idx_locations_place_id on locations(place_id) where place_id is not null;

-- Add composite index on (name, region) for name-based duplicate checking
-- This helps scrapers identify duplicates when place_id is not available
create index if not exists idx_locations_name_region on locations(name, region);
