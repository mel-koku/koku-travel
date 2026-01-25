-- Add seasonal availability support to locations
-- This migration adds fields to mark locations as seasonal (festivals, seasonal attractions)
-- and creates a table for complex availability rules.

-- Add seasonal columns to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_seasonal boolean DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS seasonal_type text;

-- Add comment describing seasonal_type values
COMMENT ON COLUMN locations.seasonal_type IS 'Type of seasonal location: festival, seasonal_attraction, winter_closure';

-- Create location_availability table for complex date rules
CREATE TABLE IF NOT EXISTS location_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  availability_type text NOT NULL, -- 'fixed_annual', 'floating_annual', 'date_range'
  month_start smallint,
  day_start smallint,
  month_end smallint,
  day_end smallint,
  week_ordinal smallint,  -- For floating dates (1-5, where 5 means "last")
  day_of_week smallint,   -- For floating dates (0=Sunday, 6=Saturday)
  year_start smallint,    -- For temporary closures/events
  year_end smallint,
  is_available boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE location_availability IS 'Stores date-based availability rules for seasonal locations';
COMMENT ON COLUMN location_availability.availability_type IS 'Type of rule: fixed_annual (specific date), floating_annual (e.g., 3rd weekend), date_range (between dates)';
COMMENT ON COLUMN location_availability.week_ordinal IS 'Week number within month (1-5, where 5 means last)';
COMMENT ON COLUMN location_availability.day_of_week IS 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN location_availability.is_available IS 'True if location IS available during this period, false if closed';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_location_availability_location_id
ON location_availability (location_id);

-- Create index for seasonal locations filtering
CREATE INDEX IF NOT EXISTS idx_locations_is_seasonal
ON locations (is_seasonal) WHERE is_seasonal = true;

-- Create index for seasonal type filtering
CREATE INDEX IF NOT EXISTS idx_locations_seasonal_type
ON locations (seasonal_type) WHERE seasonal_type IS NOT NULL;

-- Add check constraint for availability_type values
ALTER TABLE location_availability
ADD CONSTRAINT check_availability_type
CHECK (availability_type IN ('fixed_annual', 'floating_annual', 'date_range'));

-- Add check constraint for week_ordinal values
ALTER TABLE location_availability
ADD CONSTRAINT check_week_ordinal
CHECK (week_ordinal IS NULL OR (week_ordinal >= 1 AND week_ordinal <= 5));

-- Add check constraint for day_of_week values
ALTER TABLE location_availability
ADD CONSTRAINT check_day_of_week
CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));

-- Add check constraint for month values
ALTER TABLE location_availability
ADD CONSTRAINT check_month_values
CHECK (
  (month_start IS NULL OR (month_start >= 1 AND month_start <= 12)) AND
  (month_end IS NULL OR (month_end >= 1 AND month_end <= 12))
);

-- Add check constraint for day values
ALTER TABLE location_availability
ADD CONSTRAINT check_day_values
CHECK (
  (day_start IS NULL OR (day_start >= 1 AND day_start <= 31)) AND
  (day_end IS NULL OR (day_end >= 1 AND day_end <= 31))
);
