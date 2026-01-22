-- Migration: Add primary_photo_url column to locations table
-- Created: 2026-01-22
-- Purpose: Store Google Places primary photo URLs to eliminate N+1 query problem

-- =============================================================================
-- Add primary_photo_url column to locations table
-- Stores the primary photo URL fetched from Google Places API
-- NULL values indicate photo has not been enriched yet
-- =============================================================================

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS primary_photo_url TEXT;

-- =============================================================================
-- Add comment to document the column
-- =============================================================================

COMMENT ON COLUMN locations.primary_photo_url IS
  'Primary photo URL from Google Places API. Used to eliminate N+1 query problem on explore page.';
