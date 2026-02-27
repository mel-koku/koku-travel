/**
 * Geographic zone clustering for itinerary day planning.
 *
 * Divides a city's locations into ~1.5 km grid cells, flood-fills adjacent
 * occupied cells into walkable zones, then exposes helpers to assign one
 * zone per day so that activities cluster geographically.
 */

import type { Location } from "@/types/location";
import type { InterestId } from "@/types/trip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoZone {
  id: string;
  /** Grid cell keys that belong to this zone */
  cells: Set<string>;
  /** Location IDs contained in this zone */
  locationIds: Set<string>;
  /** Centroid of the zone (average lat/lng of member locations) */
  centroid: { lat: number; lng: number };
  /** Unique categories present in this zone */
  categories: Set<string>;
  /** IDs of neighboring zones (share an adjacent cell) */
  neighborIds: Set<string>;
}

export interface CityZoneMap {
  /** Zone ID → zone */
  zones: Map<string, GeoZone>;
  /** Location ID → zone ID (reverse lookup) */
  locationToZone: Map<string, string>;
  /** City center approximation (average of all location coords) */
  cityCenter: { lat: number; lng: number };
}

interface ClusterOptions {
  /** Grid cell side length in km. Default 1.5 */
  cellSizeKm?: number;
  /** Minimum locations for a zone to stand alone. Smaller zones merge. Default 3 */
  minZoneSize?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Degrees per km at a given latitude (longitude shrinks with cos(lat)). */
function degreesPerKm(latDeg: number): { latDeg: number; lngDeg: number } {
  const latRad = (latDeg * Math.PI) / 180;
  return {
    latDeg: 1 / 111.32,
    lngDeg: 1 / (111.32 * Math.cos(latRad)),
  };
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function parseCellKey(key: string): [number, number] {
  const [r, c] = key.split(",");
  return [Number(r), Number(c)];
}

// 8-connected neighbors (including diagonals)
const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

// ---------------------------------------------------------------------------
// Core: cluster city locations into zones
// ---------------------------------------------------------------------------

export function clusterCityLocations(
  locations: Location[],
  _cityKey: string,
  options?: ClusterOptions,
): CityZoneMap | null {
  const cellSizeKm = options?.cellSizeKm ?? 1.5;
  const minZoneSize = options?.minZoneSize ?? 3;

  // Filter locations with valid coordinates
  const withCoords = locations.filter(
    (loc) => loc.coordinates && typeof loc.coordinates.lat === "number" && typeof loc.coordinates.lng === "number",
  );

  if (withCoords.length < 6) {
    // Too few locations — zone filtering would be counterproductive
    return null;
  }

  // Compute bounding box
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  let sumLat = 0, sumLng = 0;

  for (const loc of withCoords) {
    const { lat, lng } = loc.coordinates!;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    sumLat += lat;
    sumLng += lng;
  }

  const cityCenter = { lat: sumLat / withCoords.length, lng: sumLng / withCoords.length };
  const { latDeg, lngDeg } = degreesPerKm(cityCenter.lat);
  const cellLatDeg = cellSizeKm * latDeg;
  const cellLngDeg = cellSizeKm * lngDeg;

  // Assign each location to a grid cell
  const cellToLocations = new Map<string, Location[]>();

  for (const loc of withCoords) {
    const { lat, lng } = loc.coordinates!;
    const row = Math.floor((lat - minLat) / cellLatDeg);
    const col = Math.floor((lng - minLng) / cellLngDeg);
    const key = cellKey(row, col);
    const list = cellToLocations.get(key);
    if (list) {
      list.push(loc);
    } else {
      cellToLocations.set(key, [loc]);
    }
  }

  // Flood-fill adjacent occupied cells into zones
  const visited = new Set<string>();
  const rawZones: { cells: Set<string>; locationIds: Set<string>; locs: Location[] }[] = [];

  for (const key of cellToLocations.keys()) {
    if (visited.has(key)) continue;

    const zoneCells = new Set<string>();
    const zoneLocIds = new Set<string>();
    const zoneLocs: Location[] = [];
    const queue = [key];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      zoneCells.add(current);

      const locsInCell = cellToLocations.get(current);
      if (locsInCell) {
        for (const loc of locsInCell) {
          zoneLocIds.add(loc.id);
          zoneLocs.push(loc);
        }
      }

      // Explore neighbors
      const [r, c] = parseCellKey(current);
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nk = cellKey(r + dr, c + dc);
        if (!visited.has(nk) && cellToLocations.has(nk)) {
          queue.push(nk);
        }
      }
    }

    rawZones.push({ cells: zoneCells, locationIds: zoneLocIds, locs: zoneLocs });
  }

  // Merge small zones into nearest neighbor
  const mergedZones = mergeSmallZones(rawZones, minZoneSize);

  // Build GeoZone objects
  const zones = new Map<string, GeoZone>();
  const locationToZone = new Map<string, string>();

  for (let i = 0; i < mergedZones.length; i++) {
    const raw = mergedZones[i]!;
    const zoneId = `zone-${i}`;

    let cLat = 0, cLng = 0;
    const categories = new Set<string>();
    for (const loc of raw.locs) {
      cLat += loc.coordinates!.lat;
      cLng += loc.coordinates!.lng;
      if (loc.category) categories.add(loc.category);
    }

    zones.set(zoneId, {
      id: zoneId,
      cells: raw.cells,
      locationIds: raw.locationIds,
      centroid: { lat: cLat / raw.locs.length, lng: cLng / raw.locs.length },
      categories,
      neighborIds: new Set(), // Populated below
    });

    for (const locId of raw.locationIds) {
      locationToZone.set(locId, zoneId);
    }
  }

  // Compute neighbor relationships between zones
  computeNeighborRelationships(zones);

  return { zones, locationToZone, cityCenter };
}

// ---------------------------------------------------------------------------
// Merge small zones into the nearest larger one
// ---------------------------------------------------------------------------

function mergeSmallZones(
  rawZones: { cells: Set<string>; locationIds: Set<string>; locs: Location[] }[],
  minZoneSize: number,
): { cells: Set<string>; locationIds: Set<string>; locs: Location[] }[] {
  const large: typeof rawZones = [];
  const small: typeof rawZones = [];

  for (const z of rawZones) {
    if (z.locationIds.size >= minZoneSize) {
      large.push(z);
    } else {
      small.push(z);
    }
  }

  // If no large zones exist, return all zones as-is (nothing to merge into)
  if (large.length === 0) return rawZones;

  for (const sz of small) {
    // Find nearest large zone by centroid distance
    let bestIdx = 0;
    let bestDist = Infinity;
    const sCentroid = computeCentroid(sz.locs);

    for (let i = 0; i < large.length; i++) {
      const lCentroid = computeCentroid(large[i]!.locs);
      const d = Math.hypot(sCentroid.lat - lCentroid.lat, sCentroid.lng - lCentroid.lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // Merge into nearest large zone
    const target = large[bestIdx]!;
    for (const c of sz.cells) target.cells.add(c);
    for (const id of sz.locationIds) target.locationIds.add(id);
    target.locs.push(...sz.locs);
  }

  return large;
}

function computeCentroid(locs: Location[]): { lat: number; lng: number } {
  let lat = 0, lng = 0;
  for (const loc of locs) {
    lat += loc.coordinates!.lat;
    lng += loc.coordinates!.lng;
  }
  return { lat: lat / locs.length, lng: lng / locs.length };
}

// ---------------------------------------------------------------------------
// Compute which zones neighbor each other (share adjacent cells)
// ---------------------------------------------------------------------------

function computeNeighborRelationships(zones: Map<string, GeoZone>): void {
  // Build cell→zoneId index
  const cellToZoneId = new Map<string, string>();
  for (const [zoneId, zone] of zones) {
    for (const c of zone.cells) {
      cellToZoneId.set(c, zoneId);
    }
  }

  for (const [zoneId, zone] of zones) {
    for (const c of zone.cells) {
      const [r, col] = parseCellKey(c);
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nk = cellKey(r + dr, col + dc);
        const neighborZoneId = cellToZoneId.get(nk);
        if (neighborZoneId && neighborZoneId !== zoneId) {
          zone.neighborIds.add(neighborZoneId);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Select the best zone for a given day
// ---------------------------------------------------------------------------

export function selectZoneForDay(
  zoneMap: CityZoneMap,
  _dayIndexInCity: number,
  _totalDaysInCity: number,
  usedZoneIds: Set<string>,
  interests: InterestId[],
  savedLocationIds?: Set<string>,
): string | null {
  if (zoneMap.zones.size === 0) return null;

  const interestToCategory: Record<string, string[]> = {
    culture: ["shrine", "temple", "landmark", "museum", "castle", "historic_site"],
    food: ["restaurant", "cafe", "market", "bar"],
    nature: ["park", "garden", "nature", "beach", "viewpoint"],
    nightlife: ["bar", "entertainment"],
    shopping: ["shopping", "market"],
    photography: ["landmark", "viewpoint", "park"],
    wellness: ["onsen", "garden", "park"],
    history: ["shrine", "temple", "museum", "castle", "historic_site"],
  };

  // Build set of categories relevant to user interests
  const relevantCategories = new Set<string>();
  for (const interest of interests) {
    const cats = interestToCategory[interest];
    if (cats) cats.forEach((c) => relevantCategories.add(c));
  }

  let bestZoneId: string | null = null;
  let bestScore = -Infinity;

  for (const [zoneId, zone] of zoneMap.zones) {
    let score = 0;

    // Available location count (more is better, up to +20)
    score += Math.min(20, zone.locationIds.size);

    // Category diversity relevant to interests (+2 per matching category, max +12)
    let categoryMatches = 0;
    for (const cat of zone.categories) {
      if (relevantCategories.has(cat)) categoryMatches++;
    }
    score += Math.min(12, categoryMatches * 2);

    // Saved locations in this zone (+8 each, strong pull)
    if (savedLocationIds) {
      for (const locId of zone.locationIds) {
        if (savedLocationIds.has(locId)) score += 8;
      }
    }

    // Penalty for already-used zones (-15 per use, but still selectable as last resort)
    if (usedZoneIds.has(zoneId)) {
      score -= 15;
    }

    // Deterministic tie-breaking: prefer zone closer to city center
    const dx = zone.centroid.lat - zoneMap.cityCenter.lat;
    const dy = zone.centroid.lng - zoneMap.cityCenter.lng;
    const distFromCenter = Math.hypot(dx, dy);
    // Small penalty that only matters as tiebreaker (0 to ~-2)
    score -= distFromCenter * 10;

    if (score > bestScore) {
      bestScore = score;
      bestZoneId = zoneId;
    }
  }

  return bestZoneId;
}

// ---------------------------------------------------------------------------
// Get expanded zone (primary + neighbors) for fallback
// ---------------------------------------------------------------------------

export function getExpandedZoneLocationIds(
  zoneMap: CityZoneMap,
  zoneId: string,
): Set<string> {
  const result = new Set<string>();
  const zone = zoneMap.zones.get(zoneId);
  if (!zone) return result;

  // Primary zone locations
  for (const id of zone.locationIds) result.add(id);

  // Neighbor zone locations
  for (const neighborId of zone.neighborIds) {
    const neighbor = zoneMap.zones.get(neighborId);
    if (neighbor) {
      for (const id of neighbor.locationIds) result.add(id);
    }
  }

  return result;
}
