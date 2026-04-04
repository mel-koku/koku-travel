-- Migration: Add NOT NULL constraint on locations.coordinates
-- Prevents ghost locations with null coordinates from breaking trip builder
-- and scoring system.

-- First deactivate any locations with null coordinates (safety net)
UPDATE locations
SET is_active = false
WHERE coordinates IS NULL AND is_active = true;

-- Add NOT NULL constraint
ALTER TABLE locations
  ALTER COLUMN coordinates SET NOT NULL;
