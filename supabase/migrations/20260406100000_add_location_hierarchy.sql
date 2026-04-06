-- Location Hierarchy: parent-child relationships, sub-experiences, and location relationships
-- Design doc: docs/location-hierarchy-design.md
-- Conflict resolution: docs/location-hierarchy-conflict-resolution.md

-- =============================================================================
-- 1. Add hierarchy columns to locations
-- =============================================================================

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS parent_id text REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_mode text CHECK (parent_mode IN ('schedulable', 'container', 'flexible')),
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Index for querying children of a parent
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id) WHERE parent_id IS NOT NULL;

-- Index for filtering top-level locations (places grid, itinerary planner)
CREATE INDEX IF NOT EXISTS idx_locations_top_level ON locations(planning_city, category) WHERE parent_id IS NULL AND is_active = true;

-- Index for finding parents by mode
CREATE INDEX IF NOT EXISTS idx_locations_parent_mode ON locations(parent_mode) WHERE parent_mode IS NOT NULL;

-- Constraint: parent_mode should only be set on locations that will have children
-- (enforced at application level, not DB level, since children are added after parent_mode is set)

-- Constraint: a location cannot be its own parent
ALTER TABLE locations ADD CONSTRAINT locations_no_self_parent CHECK (parent_id != id);

-- =============================================================================
-- 2. Create sub_experiences table
-- =============================================================================

CREATE TABLE IF NOT EXISTS sub_experiences (
  id            text PRIMARY KEY,
  location_id   text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL,
  time_estimate integer,
  tip           text,
  image         text,
  sort_order    integer DEFAULT 0,
  sub_type      text NOT NULL CHECK (sub_type IN ('highlight', 'route_stop', 'time_variant')),
  time_context  text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Index for fetching sub-experiences by location
CREATE INDEX IF NOT EXISTS idx_sub_experiences_location_id ON sub_experiences(location_id);

-- RLS: public read-only (same pattern as locations)
ALTER TABLE sub_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_experiences_public_read" ON sub_experiences
  FOR SELECT USING (true);

-- Updated_at trigger (reuse existing function from locations)
CREATE TRIGGER set_sub_experiences_updated_at
  BEFORE UPDATE ON sub_experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. Create location_relationships table
-- =============================================================================

CREATE TABLE IF NOT EXISTS location_relationships (
  id                text PRIMARY KEY,
  location_id       text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  related_id        text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN (
    'cluster', 'gateway', 'alternative', 'transit_line'
  )),
  source            text NOT NULL CHECK (source IN ('algorithmic', 'curated')),
  editorial_note    text,
  transit_line      text,
  walk_minutes      integer,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),

  UNIQUE (location_id, related_id, relationship_type)
);

-- A relationship cannot be self-referential
ALTER TABLE location_relationships ADD CONSTRAINT lr_no_self_reference CHECK (location_id != related_id);

-- Index for fetching relationships by location (both directions for bidirectional types)
CREATE INDEX IF NOT EXISTS idx_lr_location_id ON location_relationships(location_id);
CREATE INDEX IF NOT EXISTS idx_lr_related_id ON location_relationships(related_id);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_lr_type ON location_relationships(relationship_type);

-- RLS: public read-only
ALTER TABLE location_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_relationships_public_read" ON location_relationships
  FOR SELECT USING (true);
