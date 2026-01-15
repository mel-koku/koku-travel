-- Add scraping metadata columns to locations table for test data collection

-- Add new columns for scraping metadata
alter table locations add column if not exists prefecture text;
alter table locations add column if not exists description text;
alter table locations add column if not exists seed_source text;
alter table locations add column if not exists seed_source_url text;
alter table locations add column if not exists scraped_at timestamptz;
alter table locations add column if not exists enrichment_confidence numeric(3, 2);
alter table locations add column if not exists note text;

-- Create indexes for performance
create index if not exists idx_locations_prefecture on locations(prefecture);
create index if not exists idx_locations_seed_source on locations(seed_source);
create index if not exists idx_locations_scraped_at on locations(scraped_at desc nulls last);
create index if not exists idx_locations_note on locations(note) where note is not null;

-- Add comment to explain purpose
comment on column locations.prefecture is 'Prefecture where the location is situated (e.g., Kyoto, Tokyo)';
comment on column locations.description is 'Longer description text from the source website';
comment on column locations.seed_source is 'Source identifier for data provenance (e.g., hokkaido_dmo, kansai_dmo)';
comment on column locations.seed_source_url is 'Original URL where the data was scraped from';
comment on column locations.scraped_at is 'Timestamp when the data was scraped';
comment on column locations.enrichment_confidence is 'Confidence score (0-1) for Google Places API enrichment accuracy';
comment on column locations.note is 'Administrative notes (e.g., TEST DATA - DELETE BEFORE LAUNCH)';
