-- Add missing column from locations table
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
