-- Remove 'host' from valid person types (merged into 'guide')
-- 'author' is kept for editorial cross-referencing but is not a bookable type
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_type_check;
ALTER TABLE people ADD CONSTRAINT people_type_check
  CHECK (type IN ('artisan', 'guide', 'interpreter', 'author'));
