-- Add dietary_flags column to locations for per-venue dietary-accommodation badges.
-- Values: vegetarian, vegan, halal, gluten_free (initial vocab).
-- Future additions (e.g., kosher) welcome; derivation helper handles unknown values gracefully.
-- NULL = unknown (no pill rendered). Empty arrays rejected so unknown and "accepts nothing" never collide.
-- Note: the column may be written on any location, but pills only render on restaurant/cafe/bar
-- categories — non-food venues with values set will silently render nothing (render-time concern,
-- not a DB-level constraint).

alter table public.locations
  add column if not exists dietary_flags text[];

alter table public.locations
  add constraint locations_dietary_flags_nonempty
  check (dietary_flags is null or array_length(dietary_flags, 1) > 0);

create index if not exists idx_locations_dietary_flags
  on public.locations using gin (dietary_flags)
  where dietary_flags is not null;

comment on column public.locations.dietary_flags is
  'Dietary accommodations offered. NULL = unknown (no pills rendered). Non-empty: vegetarian, vegan, halal, gluten_free. Forward-compat values (e.g., kosher) are stored but render as inert until helper vocabulary expands. Empty arrays rejected by CHECK.';
