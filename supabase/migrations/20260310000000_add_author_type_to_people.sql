-- Add 'author' as a valid person type and guide_count column
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_type_check;
ALTER TABLE people ADD CONSTRAINT people_type_check
  CHECK (type IN ('artisan', 'guide', 'interpreter', 'host', 'author'));
ALTER TABLE people ADD COLUMN IF NOT EXISTS guide_count int DEFAULT 0;
