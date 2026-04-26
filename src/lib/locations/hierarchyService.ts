import { createClient } from "@/lib/supabase/server";
import { LOCATION_LISTING_COLUMNS } from "@/lib/supabase/projections";
import { transformDbRowToLocation } from "./locationService";
import type { Location, SubExperience, LocationRelationship } from "@/types/location";
import type { LocationListingDbRow } from "@/lib/supabase/projections";
import { applyActiveLocationFilters } from "@/lib/supabase/filters";
import { calculateDistance, estimateTravelTime } from "@/lib/utils/geoUtils";
import { logger } from "@/lib/logger";

/** Radius in km used to fetch coord-proximity fallback for "In this area". */
const NEARBY_AREA_RADIUS_KM = 1;
/** Cap of cards rendered in the "In this area" coord-proximity fallback. */
const NEARBY_AREA_LIMIT = 6;
/** Pre-haversine bounding-box pre-filter reads more rows so haversine has slack. */
const NEARBY_BBOX_CANDIDATE_LIMIT = 60;

/**
 * Fetches child locations of a parent.
 * Returns them sorted by sort_order, then name.
 */
export async function fetchChildLocations(parentId: string): Promise<Location[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_LISTING_COLUMNS)
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    if (error) logger.error("[fetchChildLocations] query failed", error, { parentId });
    return [];
  }

  return (data as unknown as LocationListingDbRow[]).map(transformDbRowToLocation);
}

/**
 * Fetches sub-experiences for a location.
 * Returns them sorted by sort_order.
 */
export async function fetchSubExperiences(locationId: string): Promise<SubExperience[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sub_experiences")
    .select("*")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    if (error) logger.error("[fetchSubExperiences] query failed", error, { locationId });
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    description: row.description,
    timeEstimate: row.time_estimate ?? undefined,
    tip: row.tip ?? undefined,
    image: row.image ?? undefined,
    sortOrder: row.sort_order,
    subType: row.sub_type,
    timeContext: row.time_context ?? undefined,
  }));
}

/**
 * Fetches location relationships for a given location.
 * Returns relationships where the location is either the source or target
 * (for bidirectional types like cluster and transit_line).
 */
export async function fetchLocationRelationships(
  locationId: string,
  types?: LocationRelationship["relationshipType"][],
): Promise<(LocationRelationship & { relatedLocation?: Location })[]> {
  const supabase = await createClient();

  // Fetch relationships where this location is either side
  let query1 = supabase
    .from("location_relationships")
    .select("*")
    .eq("location_id", locationId);

  let query2 = supabase
    .from("location_relationships")
    .select("*")
    .eq("related_id", locationId);

  if (types && types.length > 0) {
    query1 = query1.in("relationship_type", types);
    query2 = query2.in("relationship_type", types);
  }

  const [result1, result2] = await Promise.all([query1, query2]);

  if (result1.error) logger.error("[fetchLocationRelationships] query1 failed", result1.error, { locationId });
  if (result2.error) logger.error("[fetchLocationRelationships] query2 failed", result2.error, { locationId });

  const rows = [...(result1.data || []), ...(result2.data || [])];

  // Deduplicate (same pair can appear from both directions)
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = [r.location_id, r.related_id].sort().join("|") + r.relationship_type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Collect IDs of related locations we need to fetch
  const relatedIds = unique.map((r) =>
    r.location_id === locationId ? r.related_id : r.location_id,
  );

  // Fetch related location details
  const relatedMap = new Map<string, Location>();
  if (relatedIds.length > 0) {
    const { data: relatedData } = await supabase
      .from("locations")
      .select(LOCATION_LISTING_COLUMNS)
      .in("id", relatedIds)
      .eq("is_active", true);

    if (relatedData) {
      for (const row of relatedData as unknown as LocationListingDbRow[]) {
        relatedMap.set(row.id, transformDbRowToLocation(row));
      }
    }
  }

  return unique
    .map((row) => {
      const relatedId = row.location_id === locationId ? row.related_id : row.location_id;
      return {
        id: row.id,
        locationId: row.location_id,
        relatedId: row.related_id,
        relationshipType: row.relationship_type,
        source: row.source,
        editorialNote: row.editorial_note ?? undefined,
        transitLine: row.transit_line ?? undefined,
        walkMinutes: row.walk_minutes ?? undefined,
        sortOrder: row.sort_order,
        relatedLocation: relatedMap.get(relatedId),
      };
    })
    .filter((r) => r.relatedLocation) // Only include relationships where the related location exists and is active
    .sort((a, b) => (a.walkMinutes ?? 999) - (b.walkMinutes ?? 999));
}

/**
 * A nearby location with derived walk-time metadata, surfaced in
 * "In this area" when no curated cluster relationships exist.
 */
export type NearbyLocation = Location & { walkMinutes: number };

/**
 * Fetches schedulable locations within ~1km of a coordinate, sorted by
 * distance. Used as a fallback for "In this area" when curated
 * cluster relationships are absent (which is the common case — only ~70
 * locations have curated clusters today).
 *
 * Excludes:
 *   - the location itself
 *   - the location's parent (if any)
 *   - any container parents (they're grouping rows, not visitable places)
 *   - any locations whose `parent_id` points back at the current location
 *     (children — they have their own "Things to do here" treatment)
 *   - inactive / permanently closed rows
 */
export async function fetchNearbyLocations(
  location: Location,
  radiusKm: number = NEARBY_AREA_RADIUS_KM,
  limit: number = NEARBY_AREA_LIMIT,
): Promise<NearbyLocation[]> {
  const coords = location.coordinates;
  if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
    return [];
  }

  const supabase = await createClient();

  // Bounding box for cheap pre-filter; haversine narrows below.
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos((coords.lat * Math.PI) / 180));

  // Cheap, safe SQL filters only: bbox + active + non-container.
  // Self / parent / children exclusion happens in JS on the candidate set
  // (mirrors /api/locations/nearby — PostgREST .not(...in) and .or()
  // composition is fragile and the bbox already keeps the set small).
  const query = applyActiveLocationFilters(
    supabase.from("locations").select(LOCATION_LISTING_COLUMNS),
  )
    .gte("coordinates->lat", coords.lat - latDelta)
    .lte("coordinates->lat", coords.lat + latDelta)
    .gte("coordinates->lng", coords.lng - lngDelta)
    .lte("coordinates->lng", coords.lng + lngDelta);

  const { data, error } = await query.limit(NEARBY_BBOX_CANDIDATE_LIMIT);

  if (error || !data) {
    if (error) {
      logger.error("[fetchNearbyLocations] query failed", error, {
        locationId: location.id,
      });
    }
    return [];
  }

  const rows = data as unknown as LocationListingDbRow[];
  const parentId = location.parentId;

  const withDistance = rows
    .map((row) => {
      // Exclude self
      if (row.id === location.id) return null;
      // Exclude this location's parent — it has its own breadcrumb treatment
      if (parentId && row.id === parentId) return null;
      // Exclude this location's children — they appear in "Things to do here"
      if (row.parent_id && row.parent_id === location.id) return null;
      // Exclude container parents — they're grouping rows, not visitable
      if (row.parent_mode === "container") return null;
      if (!row.coordinates) return null;

      const distanceKm = calculateDistance(coords, row.coordinates);
      if (distanceKm > radiusKm) return null;
      return { row, distanceKm };
    })
    .filter((r): r is { row: LocationListingDbRow; distanceKm: number } => r !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  return withDistance.map(({ row, distanceKm }) => ({
    ...transformDbRowToLocation(row),
    walkMinutes: estimateTravelTime(distanceKm, "walk"),
  }));
}

/**
 * Fetches full hierarchy context for a location detail page.
 * Returns children, sub-experiences, and relationships in parallel.
 *
 * `nearby` is a coord-proximity fallback for "In this area" — only
 * populated when there are no curated cluster relationships. This keeps
 * the section confident on the ~98% of places that aren't seeded with
 * curated clusters.
 */
export async function fetchHierarchyContext(location: Location) {
  const isParent = !!location.parentMode;
  const hasId = !!location.id;

  if (!hasId) {
    return { children: [], subExperiences: [], relationships: [], nearby: [] };
  }

  const [children, subExperiences, relationships] = await Promise.all([
    isParent ? fetchChildLocations(location.id) : Promise.resolve([]),
    fetchSubExperiences(location.id),
    fetchLocationRelationships(location.id, ["cluster", "alternative"]),
  ]);

  // Curated clusters win when present. Otherwise fall back to coord-prox
  // so the section always populates when the place has coordinates.
  const hasCuratedClusters = relationships.some(
    (r) => r.relationshipType === "cluster",
  );
  const nearby = hasCuratedClusters
    ? []
    : await fetchNearbyLocations(location);

  return { children, subExperiences, relationships, nearby };
}
