-- Add location_id for linking people to locations (craft, places) that don't have experience_slug
alter table people_experiences add column if not exists location_id text;

-- Make experience_slug nullable (location_id can be used instead)
alter table people_experiences alter column experience_slug drop not null;

-- Index for location_id lookups
create index if not exists idx_people_experiences_location on people_experiences(location_id)
  where location_id is not null;

-- Unique constraint for person + location (prevents duplicates)
create unique index if not exists idx_people_experiences_person_location
  on people_experiences(person_id, location_id)
  where location_id is not null;
