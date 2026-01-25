-- Add soft delete support to favorites table for consistency with trips table
-- This is optional - favorites can still be hard deleted since they're simple toggles

-- Add deleted_at column
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add index for efficient queries excluding soft-deleted records
CREATE INDEX IF NOT EXISTS idx_favorites_user_active
ON favorites(user_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Comment explaining soft delete usage
COMMENT ON COLUMN favorites.deleted_at IS 'Soft delete timestamp. NULL means active. Optional - favorites can be hard deleted.';

/*
Soft Delete Pattern Usage:
-------------------------
-- To soft delete a favorite:
UPDATE favorites SET deleted_at = NOW() WHERE user_id = ? AND place_id = ?;

-- To query active favorites only:
SELECT * FROM favorites WHERE user_id = ? AND deleted_at IS NULL;

-- To restore a soft-deleted favorite:
UPDATE favorites SET deleted_at = NULL WHERE user_id = ? AND place_id = ?;

Note: The existing removeFavorite() function uses hard delete.
To switch to soft delete, update src/services/sync/favoriteSync.ts and
src/hooks/useFavoritesQuery.ts to use UPDATE instead of DELETE.
*/
