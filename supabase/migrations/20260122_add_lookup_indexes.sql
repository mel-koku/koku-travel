-- Migration: Add lookup indexes for user-specific queries
-- Created: 2026-01-22

-- =============================================================================
-- 1. Composite index for favorites lookup
-- Optimizes queries that filter by user_id and place_id
-- Note: The unique constraint already creates an index, but this ensures it
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_favorites_user_place
  ON favorites(user_id, place_id);

-- =============================================================================
-- 2. Composite index for guide bookmarks lookup
-- Optimizes queries that filter by user_id and guide_id
-- Note: The unique constraint already creates an index, but this ensures it
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_guide_bookmarks_user_guide
  ON guide_bookmarks(user_id, guide_id);

-- =============================================================================
-- 3. Index for place_details lookup by place_id
-- Optimizes queries that look up cached place details by Google Place ID
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_place_details_place_id
  ON place_details(place_id);
