-- Add is_hidden_gem boolean column to locations table
-- Used for the "Hidden Gems" vibe filter on the explore page
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_hidden_gem boolean DEFAULT false;
