-- Fix migration tracking for already-applied migrations
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- First, check what migrations are already tracked
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;

-- If version 20241112 is missing but favorites table exists, insert it:
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
SELECT 
  '20241112',
  'create_favorites_table',
  ARRAY[]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20241112'
);

-- If version 20241112120000 is missing but guide_bookmarks table exists:
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
SELECT 
  '20241112120000',
  'create_guide_bookmarks',
  ARRAY[]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20241112120000'
);

-- If version 20241113 is missing but place_details table exists:
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
SELECT 
  '20241113',
  'create_place_details_table',
  ARRAY[]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20241113'
);

-- If version 20241113120000 is missing but profiles table exists:
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
SELECT 
  '20241113120000',
  'create_profiles_table',
  ARRAY[]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20241113120000'
);

-- Verify the results
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
