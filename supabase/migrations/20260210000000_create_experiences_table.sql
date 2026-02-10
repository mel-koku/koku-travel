-- Create experiences table for tours, workshops, cruises, and other non-place entries
-- These are moved from the locations table to keep them out of explore/itinerary
-- but preserved for potential future use.
--
-- Run this in the Supabase SQL Editor before running fix-audit-locations.ts

CREATE TABLE IF NOT EXISTS experiences (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text,
  city text,
  source_category text,          -- original category from locations table
  experience_type text,           -- tour, workshop, cruise, experience, adventure, rental
  image text,
  min_budget text,
  estimated_duration text,
  operating_hours jsonb,
  recommended_visit text,
  preferred_transit_modes text[],
  coordinates jsonb,
  timezone text,
  short_description text,
  rating numeric,
  review_count integer,
  place_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  prefecture text,
  description text,
  note text,
  primary_photo_url text,
  google_primary_type text,
  google_types text[],
  business_status text,
  price_level integer,
  accessibility_options jsonb,
  dietary_options jsonb,
  service_options jsonb,
  meal_options jsonb,
  lat numeric,
  lng numeric,
  neighborhood text,
  good_for_children boolean,
  good_for_groups boolean,
  outdoor_seating boolean,
  reservable boolean,
  editorial_summary text,
  is_seasonal boolean DEFAULT false,
  seasonal_type text,
  website_uri text,
  phone_number text,
  google_maps_uri text,
  name_japanese text,
  nearest_station text,
  cash_only boolean,
  reservation_info text
);

-- Enable RLS (match locations table pattern)
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- Allow public read access (same as locations)
CREATE POLICY "Allow public read access" ON experiences
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON experiences
  FOR ALL USING (auth.role() = 'service_role');
