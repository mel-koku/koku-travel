/**
 * City sequence optimization for itinerary routing.
 *
 * This module provides functions to determine the optimal order of cities
 * for a trip, minimizing travel time and grouping cities by region.
 */

import { getRegionForCity, REGIONS } from "@/data/regions";
import type { CityId, RegionId, TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import { getNearestCityToEntryPoint, travelMinutes, travelTimeFromEntryPoint } from "@/lib/travelTime";
import { normalizeKey } from "@/lib/utils/stringUtils";

export type CityInfo = {
  key: string;
  label: string;
  regionId?: RegionId;
};

const DEFAULT_CITY_ROTATION: readonly CityId[] = ["kyoto", "tokyo", "osaka"] as const;

// Build region and city lookup maps from REGIONS data
const REGION_ID_BY_LABEL = new Map<string, RegionId>();
const CITY_INFO_BY_KEY = new Map<string, CityInfo>();

REGIONS.forEach((region) => {
  REGION_ID_BY_LABEL.set(normalizeKey(region.name), region.id);
  region.cities.forEach((city) => {
    const key = normalizeKey(city.id);
    CITY_INFO_BY_KEY.set(key, { key, label: city.name, regionId: region.id });
  });
});

export { CITY_INFO_BY_KEY, REGION_ID_BY_LABEL };

/**
 * Expand city sequence to fill the required number of days.
 * Uses contiguous block allocation: all days in one city before moving to the next.
 * This prevents back-and-forth travel between cities.
 *
 * Algorithm:
 * 1. Calculate baseDaysPerCity = floor(totalDays / totalCities)
 * 2. Calculate remainderDays = totalDays % totalCities
 * 3. For each city in order:
 *    - Allocate baseDaysPerCity days (plus 1 extra if remainder available)
 *    - Add all days contiguously before moving to next city
 *
 * @example
 * // 7 days, [Kyoto, Osaka] → Kyoto x4, Osaka x3
 * // 5 days, [Kyoto, Osaka, Tokyo] → Kyoto x2, Osaka x2, Tokyo x1
 */
export function expandCitySequenceForDays(
  citySequence: CityInfo[],
  totalDays: number,
  cityDays?: number[],
): CityInfo[] {
  if (citySequence.length === 0 || totalDays === 0) {
    return citySequence;
  }

  // If we have exactly the right number of cities, return as-is
  if (citySequence.length === totalDays && !cityDays) {
    return citySequence;
  }

  const expanded: CityInfo[] = [];

  // Use explicit per-city allocation when provided (parallel array)
  if (cityDays) {
    for (let i = 0; i < citySequence.length; i++) {
      const days = cityDays[i] ?? 1;
      for (let d = 0; d < days && expanded.length < totalDays; d++) {
        expanded.push(citySequence[i]!);
      }
    }
    return expanded.slice(0, totalDays);
  }

  const totalCities = citySequence.length;

  // Calculate base days per city and remainder
  const baseDaysPerCity = Math.floor(totalDays / totalCities);
  let remainderDays = totalDays % totalCities;

  // Allocate days contiguously to each city
  for (const cityInfo of citySequence) {
    // Each city gets at least baseDaysPerCity days
    // Cities earlier in the sequence get +1 day if there's remainder
    let daysForThisCity = baseDaysPerCity;
    if (remainderDays > 0) {
      daysForThisCity += 1;
      remainderDays -= 1;
    }

    // Ensure at least 1 day per city
    daysForThisCity = Math.max(1, daysForThisCity);

    // Add all days for this city contiguously
    for (let i = 0; i < daysForThisCity && expanded.length < totalDays; i++) {
      expanded.push(cityInfo);
    }
  }

  // Trim to exact number of days (handles edge cases)
  return expanded.slice(0, totalDays);
}

/**
 * Resolve the city sequence based on user selections.
 *
 * @param data - Trip builder data with user selections
 * @param locationsByCityKey - Map of city keys to locations
 * @param allLocations - All available locations
 * @returns Array of CityInfo in optimal visit order
 */
export function resolveCitySequence(
  data: TripBuilderData,
  locationsByCityKey: Map<string, Location[]>,
  allLocations: Location[],
): CityInfo[] {
  const sequence: CityInfo[] = [];
  const seen = new Set<string>();

  function addCityByKey(cityKey: string | undefined, allowDuplicate = false): void {
    if (!cityKey || (!allowDuplicate && seen.has(cityKey))) {
      return;
    }
    if (!locationsByCityKey.has(cityKey)) {
      return;
    }
    // Use existing info or create a fallback for dynamic cities
    const info = CITY_INFO_BY_KEY.get(cityKey) ?? (() => {
      const regionIdFromLabel = REGION_ID_BY_LABEL.get(cityKey);
      const label = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
      const fallback: CityInfo = { key: cityKey, label, regionId: regionIdFromLabel };
      CITY_INFO_BY_KEY.set(cityKey, fallback);
      return fallback;
    })();
    sequence.push(info);
    seen.add(cityKey);
  }

  // Collect user-selected cities
  const userCities: CityId[] = [];
  if (data.cities && data.cities.length > 0) {
    userCities.push(...data.cities);
  }

  // Only expand regions into cities when no explicit cities were selected
  // (legacy fallback for old region-only selections). With city-first
  // selection, regions are derived metadata and shouldn't add extra cities.
  if (userCities.length === 0 && data.regions && data.regions.length > 0) {
    data.regions.forEach((regionId) => {
      const region = REGIONS.find((r) => r.id === regionId);
      region?.cities.forEach((city) => {
        if (!userCities.includes(city.id)) {
          userCities.push(city.id);
        }
      });
    });
  }

  // If no user selections, use defaults
  const citiesToOptimize = userCities.length > 0 ? userCities : [...DEFAULT_CITY_ROTATION];

  // If the user manually reordered cities, respect their order.
  // Allow duplicates (e.g., Tokyo → Osaka → Tokyo round trips).
  // Otherwise optimize city sequence by region to minimize travel time.
  if (data.customCityOrder && citiesToOptimize.length > 0) {
    citiesToOptimize.forEach((cityId) => addCityByKey(cityId, true));
  } else if (citiesToOptimize.length > 0) {
    // Dedupe input in auto mode — the user just picked a bag of cities.
    const uniqueInput = Array.from(new Set(citiesToOptimize));
    const effectiveExit = data.sameAsEntry !== false ? data.entryPoint : data.exitPoint;
    const optimizedSequence = optimizeCitySequence(data.entryPoint, uniqueInput, effectiveExit);
    // Allow duplicates through the dedup pass because optimizeCitySequence may
    // append the entry city at the end (appendReturnCityIfNeeded) when the
    // trip would otherwise strand the traveler far from the exit airport.
    // Input was already deduped above, so the only duplicate at this point is
    // the intentional return leg.
    optimizedSequence.forEach((cityId) => addCityByKey(cityId, true));
  }

  // Fallback if still empty
  if (sequence.length === 0) {
    DEFAULT_CITY_ROTATION.forEach((cityId) => addCityByKey(cityId));
  }

  if (sequence.length === 0) {
    const firstLocation = allLocations[0];
    if (firstLocation) {
      const firstCityKey = normalizeKey(firstLocation.city);
      addCityByKey(firstCityKey);
    }
  }

  if (sequence.length === 0) {
    sequence.push({ key: "japan", label: "Japan" });
  }

  return sequence;
}

/**
 * Optimize city sequence based on entry point and geographic grouping.
 * Groups cities by region first, then optimizes order within regions and between regions
 * to minimize travel time - similar to how a human travel agent would plan.
 */
export function optimizeCitySequence(
  entryPoint: TripBuilderData["entryPoint"],
  cities: CityId[],
  exitPoint?: TripBuilderData["exitPoint"],
): CityId[] {
  if (cities.length === 0) {
    return cities;
  }

  // Group cities by region
  const citiesByRegion = new Map<RegionId, CityId[]>();
  for (const city of cities) {
    const regionId = getRegionForCity(city);
    if (regionId) {
      const regionCities = citiesByRegion.get(regionId) ?? [];
      regionCities.push(city);
      citiesByRegion.set(regionId, regionCities);
    }
  }

  // If no regions found or only one region, fall back to simple optimization
  if (citiesByRegion.size <= 1) {
    const result = optimizeCitiesWithinRegion(cities, entryPoint, exitPoint, true);
    return appendReturnCityIfNeeded(result, entryPoint, exitPoint);
  }

  // Detect round trip: exit region equals entry region
  const effectiveExit = exitPoint ?? entryPoint;
  let entryRegion: RegionId | undefined;
  let exitRegionId: RegionId | undefined;
  if (entryPoint) {
    const nearestToEntry = getNearestCityToEntryPoint(entryPoint);
    if (nearestToEntry) entryRegion = getRegionForCity(nearestToEntry);
  }
  if (effectiveExit) {
    const nearestToExit = getNearestCityToEntryPoint(effectiveExit);
    if (nearestToExit) exitRegionId = getRegionForCity(nearestToExit);
  }
  const isRoundTrip = entryRegion && exitRegionId && entryRegion === exitRegionId
    && citiesByRegion.has(entryRegion) && (citiesByRegion.get(entryRegion)?.length ?? 0) >= 2;

  // Round trip with multiple regions: split the start region so the trip loops
  // back. Entry city first → other regions → remaining start-region cities with
  // the nearest-to-exit city last.
  if (isRoundTrip && entryRegion) {
    const startRegionCities = citiesByRegion.get(entryRegion)!;
    const entryCityId = entryPoint ? getNearestCityToEntryPoint(entryPoint) : undefined;
    const entryCity = entryCityId && startRegionCities.includes(entryCityId)
      ? entryCityId
      : startRegionCities[0]!;
    const tailCities = startRegionCities.filter(c => c !== entryCity);

    // Order other regions (excluding start region) using greedy nearest-neighbor
    const otherRegionKeys = Array.from(citiesByRegion.keys()).filter(r => r !== entryRegion);
    const otherRegionOrder = otherRegionKeys.length > 1
      ? optimizeRegionOrder(otherRegionKeys, entryPoint, citiesByRegion, exitPoint)
      : otherRegionKeys;

    // Optimize cities within each non-start region
    const lastOtherRegion = otherRegionOrder[otherRegionOrder.length - 1];
    const result: CityId[] = [entryCity];
    for (const regionId of otherRegionOrder) {
      const isLast = regionId === lastOtherRegion && tailCities.length === 0;
      const regionCities = citiesByRegion.get(regionId)!;
      result.push(...optimizeCitiesWithinRegion(regionCities, entryPoint, isLast ? exitPoint : undefined, isLast));
    }

    // Add tail cities (remaining start-region cities), with nearest-to-exit last
    if (tailCities.length > 0) {
      const optimizedTail = optimizeCitiesWithinRegion(tailCities, entryPoint, exitPoint, true);
      result.push(...optimizedTail);
    }

    const pinned = pinExitCityLast(result, entryPoint, exitPoint);
    return appendReturnCityIfNeeded(pinned, entryPoint, exitPoint);
  }

  // Non-round-trip: group by region and concatenate in optimal order
  const regionKeys = Array.from(citiesByRegion.keys());
  const regionOrder = optimizeRegionOrder(
    regionKeys,
    entryPoint,
    citiesByRegion,
    exitPoint,
  );

  const lastRegion = regionOrder[regionOrder.length - 1];

  // Optimize order within each region
  const optimizedRegions = new Map<RegionId, CityId[]>();
  for (const [regionId, regionCities] of citiesByRegion.entries()) {
    const isLastRegion = regionId === lastRegion;
    optimizedRegions.set(
      regionId,
      optimizeCitiesWithinRegion(regionCities, entryPoint, isLastRegion ? exitPoint : undefined, isLastRegion),
    );
  }

  // Concatenate cities in optimal region order
  const result: CityId[] = [];
  for (const regionId of regionOrder) {
    const regionCities = optimizedRegions.get(regionId);
    if (regionCities) {
      result.push(...regionCities);
    }
  }

  // Final pass: ensure last city is near the departure airport.
  // Region-based grouping can strand the trip far from exit (e.g., one-way trip
  // ending far from exit airport). Move a closer city to the end when possible.
  const pinned = pinExitCityLast(result, entryPoint, exitPoint);

  return appendReturnCityIfNeeded(pinned, entryPoint, exitPoint);
}

/**
 * Minutes from exit beyond which we consider the last city "far" and look for
 * a closer alternative to pin at the end of the sequence.
 */
const DEPARTURE_COMFORT_MINUTES = 90;

/**
 * Move the nearest-to-exit city to the last position when the current last
 * city is far from the departure airport AND a meaningfully closer city exists
 * in the sequence. Skips the first city (entry pin) to avoid disrupting the
 * start of the trip.
 */
function pinExitCityLast(
  cities: CityId[],
  entryPoint: TripBuilderData["entryPoint"],
  exitPoint?: TripBuilderData["exitPoint"],
): CityId[] {
  const effectiveExit = exitPoint ?? entryPoint;
  if (!effectiveExit || cities.length <= 2) return cities;

  const lastCity = cities[cities.length - 1]!;
  const lastTime = travelTimeFromEntryPoint(effectiveExit, lastCity);

  // Current last city is already comfortable — no change needed
  if (lastTime !== undefined && lastTime <= DEPARTURE_COMFORT_MINUTES) return cities;

  // Find nearest-to-exit city, skipping index 0 (entry pin)
  let bestIdx = -1;
  let bestTime = Infinity;
  for (let i = 1; i < cities.length; i++) {
    const time = travelTimeFromEntryPoint(effectiveExit, cities[i]!);
    if (time !== undefined && time < bestTime) {
      bestTime = time;
      bestIdx = i;
    }
  }

  // Only move if the candidate is within the comfort zone
  if (bestIdx === -1 || bestIdx === cities.length - 1) return cities;
  if (bestTime > DEPARTURE_COMFORT_MINUTES) return cities;

  const result = [...cities];
  const [moved] = result.splice(bestIdx, 1);
  result.push(moved!);
  return result;
}

/**
 * Auto-append the airport city when the last city is far (>2h) from the
 * departure airport. Only called during sequence optimization (not custom order).
 */
function appendReturnCityIfNeeded(
  cities: CityId[],
  entryPoint: TripBuilderData["entryPoint"],
  exitPoint?: TripBuilderData["exitPoint"],
): CityId[] {
  const effectiveExit = exitPoint ?? entryPoint;
  if (!effectiveExit || cities.length === 0) return cities;

  const lastCity = cities[cities.length - 1]!;
  const nearestCity = getNearestCityToEntryPoint(effectiveExit);
  if (!nearestCity || lastCity === nearestCity) return cities;

  const time = travelTimeFromEntryPoint(effectiveExit, lastCity);
  if (time !== undefined && time > DEPARTURE_COMFORT_MINUTES) {
    return [...cities, nearestCity];
  }
  return cities;
}

/**
 * Optimize city order within a single region using travel time.
 * Uses greedy nearest-neighbor approach starting from the entry point or first city.
 */
export function optimizeCitiesWithinRegion(
  cities: CityId[],
  entryPoint: TripBuilderData["entryPoint"],
  exitPoint?: TripBuilderData["exitPoint"],
  isLastRegion?: boolean,
): CityId[] {
  if (cities.length <= 1) {
    return cities;
  }

  // Find starting city (nearest to entry point if available, otherwise first city)
  let startCity: CityId | undefined;
  if (entryPoint) {
    const nearestCity = getNearestCityToEntryPoint(entryPoint);
    if (nearestCity && cities.includes(nearestCity)) {
      startCity = nearestCity;
    }
  }

  if (!startCity) {
    startCity = cities[0];
  }

  if (!startCity) {
    return cities; // Fallback if no cities available
  }

  // Find end city pinned to exit point (only for last region)
  let endCity: CityId | undefined;
  if (isLastRegion && exitPoint) {
    const nearestToExit = getNearestCityToEntryPoint(exitPoint);
    if (nearestToExit && cities.includes(nearestToExit) && nearestToExit !== startCity) {
      endCity = nearestToExit;
    }
  }

  const optimized: CityId[] = [startCity];
  const unvisited = new Set(cities.filter((c) => c !== startCity && c !== endCity));
  let currentCity: CityId = startCity;

  // Greedy nearest-neighbor for middle cities
  while (unvisited.size > 0) {
    let nearest: CityId | undefined;
    let minTime = Infinity;

    for (const city of unvisited) {
      const time = travelMinutes(currentCity, city);
      if (time !== undefined && time < minTime) {
        minTime = time;
        nearest = city;
      }
    }

    if (nearest) {
      optimized.push(nearest);
      unvisited.delete(nearest);
      currentCity = nearest;
    } else {
      // No travel time data, add remaining cities
      optimized.push(...Array.from(unvisited));
      break;
    }
  }

  // Pin end city last
  if (endCity) {
    optimized.push(endCity);
  }

  return optimized;
}

/**
 * Optimize the order of regions based on entry point proximity and inter-region travel time.
 * Returns regions in optimal order (e.g., Kansai first, then Kanto, or vice versa).
 */
export function optimizeRegionOrder(
  regions: RegionId[],
  entryPoint: TripBuilderData["entryPoint"],
  citiesByRegion: Map<RegionId, CityId[]>,
  exitPoint?: TripBuilderData["exitPoint"],
): RegionId[] {
  if (regions.length <= 1) {
    return regions;
  }

  // Find which region contains the nearest city to entry point
  let startRegion: RegionId | undefined;
  if (entryPoint) {
    const nearestCity = getNearestCityToEntryPoint(entryPoint);
    if (nearestCity) {
      const nearestRegion = getRegionForCity(nearestCity);
      if (nearestRegion && regions.includes(nearestRegion)) {
        startRegion = nearestRegion;
      }
    }
  }

  // Find exit region (nearest city to exit point)
  let exitRegion: RegionId | undefined;
  if (exitPoint) {
    const nearestToExit = getNearestCityToEntryPoint(exitPoint);
    if (nearestToExit) {
      const nearestRegion = getRegionForCity(nearestToExit);
      if (nearestRegion && regions.includes(nearestRegion)) {
        exitRegion = nearestRegion;
      }
    }
  }

  // If no entry point or nearest region not in selection, use first region
  if (!startRegion) {
    startRegion = regions[0];
  }

  if (!startRegion) {
    return regions; // Fallback if no start region
  }

  // If exit region is the same as start region (round-trip), let the
  // greedy algorithm handle it naturally — no need to pin
  if (exitRegion === startRegion) {
    exitRegion = undefined;
  }

  const optimized: RegionId[] = [startRegion];
  // Exclude both start and pinned exit region from greedy candidates
  const unvisited = new Set(regions.filter((r) => r !== startRegion && r !== exitRegion));

  // Optimize region order using travel time between regions
  // Use the first city of each region as a representative for inter-region travel
  let currentRegion = startRegion;

  while (unvisited.size > 0) {
    let nearestRegion: RegionId | undefined;
    let minTime = Infinity;

    const currentRegionCities = citiesByRegion.get(currentRegion);
    const currentRepresentative = currentRegionCities?.[currentRegionCities.length - 1]; // Use last city of current region

    for (const region of unvisited) {
      const regionCities = citiesByRegion.get(region);
      const regionRepresentative = regionCities?.[0]; // Use first city of next region

      if (currentRepresentative && regionRepresentative) {
        const time = travelMinutes(currentRepresentative, regionRepresentative);
        if (time !== undefined && time < minTime) {
          minTime = time;
          nearestRegion = region;
        }
      }
    }

    if (nearestRegion) {
      optimized.push(nearestRegion);
      unvisited.delete(nearestRegion);
      currentRegion = nearestRegion;
    } else {
      // No travel time data, add remaining regions
      optimized.push(...Array.from(unvisited));
      break;
    }
  }

  // Append exit region at the end
  if (exitRegion) {
    optimized.push(exitRegion);
  }

  return optimized;
}

/**
 * Check whether the last city in a sequence is far from the departure airport.
 * Returns travel time in minutes and the threshold, or null when data is missing.
 */
export function getDepartureDistanceWarning(
  cities: CityId[],
  entryPoint: TripBuilderData["entryPoint"],
  exitPoint?: TripBuilderData["exitPoint"],
): { lastCity: CityId; minutes: number; threshold: number } | null {
  if (!entryPoint || cities.length === 0) return null;
  const effectiveExit = exitPoint ?? entryPoint;
  const lastCity = cities[cities.length - 1]!;
  const time = travelTimeFromEntryPoint(effectiveExit, lastCity);
  if (time === undefined || time <= DEPARTURE_COMFORT_MINUTES) return null;
  return { lastCity, minutes: time, threshold: DEPARTURE_COMFORT_MINUTES };
}
