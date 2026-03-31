-- Composite indexes for common query patterns identified in cost audit.
-- These complement the existing single-column indexes.

-- availability_rules: queried by (person_id, specific_date) in availabilityService
CREATE INDEX IF NOT EXISTS idx_avail_rules_person_date
  ON availability_rules(person_id, specific_date)
  WHERE specific_date IS NOT NULL;

-- pricing_rules: queried by (person_id, experience_slug) in pricingService
-- Replaces separate person_id + experience_slug indexes for this query pattern
CREATE INDEX IF NOT EXISTS idx_pricing_person_exp
  ON pricing_rules(person_id, experience_slug);

-- people_experiences: queried by (experience_slug, role) in peopleService
CREATE INDEX IF NOT EXISTS idx_people_exp_slug_role
  ON people_experiences(experience_slug, role);

-- locations: filtered by (is_active, is_accommodation) then grouped by city
-- in filter-options and cities API routes
CREATE INDEX IF NOT EXISTS idx_locations_city_active_accom
  ON locations(city, is_active, is_accommodation)
  WHERE is_active = true;
