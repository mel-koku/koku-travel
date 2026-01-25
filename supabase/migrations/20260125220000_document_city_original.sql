-- Document the purpose of city_original column
-- This column is intentionally retained for data integrity and rollback purposes

-- Add comment explaining the column's purpose
COMMENT ON COLUMN locations.city_original IS 'Backup of original city value before ward consolidation (e.g., "Sakyo Ward" before being normalized to "Kyoto"). Used by maintenance scripts for data recovery. Do not remove.';

-- Note: city_original is used by:
-- - scripts/rollback-city-corruption.ts - Restores city values from backup
-- - scripts/consolidate-city-wards.ts - Backs up city before normalization
-- - scripts/audit-city-region-mismatch.ts - Audits data integrity
