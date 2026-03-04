-- Merge "host" person type into "guide"
-- Host and guide had no functional difference in the UI

-- 1. Convert all host people to guide
UPDATE people SET type = 'guide' WHERE type = 'host';

-- 2. Convert host roles to lead in people_experiences
UPDATE people_experiences SET role = 'lead' WHERE role = 'host';

-- 3. Drop and recreate check constraints without 'host'
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_type_check;
ALTER TABLE people ADD CONSTRAINT people_type_check
  CHECK (type IN ('artisan', 'guide', 'interpreter', 'author'));

ALTER TABLE people_experiences DROP CONSTRAINT IF EXISTS people_experiences_role_check;
ALTER TABLE people_experiences ADD CONSTRAINT people_experiences_role_check
  CHECK (role IN ('lead', 'assistant', 'interpreter'));
