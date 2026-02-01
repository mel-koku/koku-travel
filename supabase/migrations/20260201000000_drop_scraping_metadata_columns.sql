-- Drop scraping metadata columns that are no longer needed
-- These were used during the data seeding phase but aren't used at runtime

-- Drop indexes first
drop index if exists idx_locations_seed_source;
drop index if exists idx_locations_scraped_at;

-- Drop the columns
alter table locations drop column if exists seed_source;
alter table locations drop column if exists seed_source_url;
alter table locations drop column if exists scraped_at;
alter table locations drop column if exists enrichment_confidence;

-- Clear note column values (keeping the column for future use)
update locations set note = null where note is not null;

-- Update comment on note column
comment on column locations.note is 'General purpose notes field for future use';
