/**
 * Geographic validation utilities for filtering locations by city and region.
 *
 * This module provides functions to validate that locations are geographically
 * appropriate for a given city, preventing cross-region recommendations.
 */

import { REGIONS } from "@/data/regions";
import { normalizeKey } from "@/lib/utils/stringUtils";
import type { Location } from "@/types/location";
import type { RegionId } from "@/types/trip";
import { calculateDistance } from "@/lib/utils/geoUtils";
import { logger } from "@/lib/logger";

/**
 * Maximum distance (in km) from city center for a location to be considered valid.
 * Locations beyond this distance are filtered out to prevent cross-region recommendations.
 */
export const MAX_DISTANCE_FROM_CITY_KM = 100;

/**
 * City center coordinates for distance validation.
 * Used to ensure locations are within reasonable distance of the selected city.
 */
export const CITY_CENTER_COORDINATES: Record<string, { lat: number; lng: number }> = {
  tokyo: { lat: 35.6762, lng: 139.6503 },
  yokohama: { lat: 35.4437, lng: 139.6380 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  nara: { lat: 34.6851, lng: 135.8048 },
  kobe: { lat: 34.6901, lng: 135.1956 },
  nagoya: { lat: 35.1815, lng: 136.9066 },
  fukuoka: { lat: 33.5904, lng: 130.4017 },
  sapporo: { lat: 43.0618, lng: 141.3545 },
  sendai: { lat: 38.2682, lng: 140.8694 },
  hiroshima: { lat: 34.3853, lng: 132.4553 },
  kanazawa: { lat: 36.5613, lng: 136.6562 },
  naha: { lat: 26.2124, lng: 127.6809 },
  matsuyama: { lat: 33.8416, lng: 132.7657 },
  takamatsu: { lat: 34.3401, lng: 134.0434 },
  hakodate: { lat: 41.7687, lng: 140.7288 },
  nagasaki: { lat: 32.7503, lng: 129.8779 },
};

/**
 * Expected region for each city.
 * Used to validate that locations in a city actually belong to that city's region.
 */
export const CITY_EXPECTED_REGION: Record<string, string> = {
  tokyo: "Kanto",
  yokohama: "Kanto",
  osaka: "Kansai",
  kyoto: "Kansai",
  nara: "Kansai",
  kobe: "Kansai",
  nagoya: "Chubu",
  fukuoka: "Kyushu",
  sapporo: "Hokkaido",
  sendai: "Tohoku",
  hiroshima: "Chugoku",
  kanazawa: "Chubu",
  naha: "Okinawa",
  matsuyama: "Shikoku",
  takamatsu: "Shikoku",
  hakodate: "Hokkaido",
  nagasaki: "Kyushu",
};

/**
 * Region bounding boxes for coordinate-based validation.
 */
export const REGION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  Hokkaido: { north: 45.5, south: 41.4, east: 145.9, west: 139.3 },
  Tohoku: { north: 41.5, south: 37.0, east: 142.1, west: 139.0 },
  Kanto: { north: 37.0, south: 34.5, east: 140.9, west: 138.2 },
  Chubu: { north: 37.5, south: 34.5, east: 139.2, west: 135.8 },
  Kansai: { north: 36.0, south: 33.4, east: 136.8, west: 134.0 },
  Chugoku: { north: 36.0, south: 33.5, east: 134.5, west: 130.8 },
  Shikoku: { north: 34.5, south: 32.7, east: 134.8, west: 132.0 },
  Kyushu: { north: 34.3, south: 31.0, east: 132.1, west: 129.5 },
  Okinawa: { north: 27.5, south: 24.0, east: 131.5, west: 122.9 },
};

/**
 * Check if coordinates fall within a region's bounding box.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @param regionName - Name of the region to check against
 * @returns True if coordinates are within the region bounds
 */
export function isWithinRegionBounds(
  lat: number,
  lng: number,
  regionName: string
): boolean {
  const bounds = REGION_BOUNDS[regionName];
  if (!bounds) return true; // Allow if region not found
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Find which region contains the given coordinates.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Region name if found, null otherwise
 */
export function findRegionByCoordinates(lat: number, lng: number): string | null {
  for (const [region, bounds] of Object.entries(REGION_BOUNDS)) {
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return region;
    }
  }
  return null;
}


/**
 * Validate that a location is geographically appropriate for a city.
 * Returns true if the location should be included, false if it should be filtered out.
 *
 * This prevents data corruption issues where locations like "Cape Higashi, Osaka, Okinawa"
 * are incorrectly recommended for Osaka because the city field says "Osaka" but the
 * coordinates are in Okinawa.
 *
 * @param location - The location to validate
 * @param cityKey - The normalized city key
 * @param expectedRegionId - The expected region ID for the city
 * @returns True if the location is valid for the city
 */
export function isLocationValidForCity(
  location: Location,
  cityKey: string,
  expectedRegionId?: RegionId
): boolean {
  // If location's city matches the target city, trust the database
  // This avoids issues with overlapping region bounding boxes
  const locationCityKey = normalizeKey(location.city);
  if (locationCityKey === cityKey) {
    return true;
  }

  // 1. Check region consistency
  const expectedRegion = expectedRegionId
    ? REGIONS.find((r) => r.id === expectedRegionId)?.name
    : CITY_EXPECTED_REGION[cityKey];

  if (expectedRegion && location.region) {
    // If location's region doesn't match expected region for this city, reject it
    if (location.region !== expectedRegion) {
      logger.debug(`Filtering out "${location.name}": region "${location.region}" doesn't match expected "${expectedRegion}" for city "${cityKey}"`);
      return false;
    }
  }

  // 2. Check coordinate-based region (more reliable than region field)
  // Skip this check for regions with overlapping boundaries (Shikoku, Chugoku, Kansai)
  // as it causes false negatives
  if (location.coordinates && expectedRegion) {
    const regionsWithOverlap = ["Shikoku", "Chugoku", "Kansai"];
    if (!regionsWithOverlap.includes(expectedRegion)) {
      const coordinateRegion = findRegionByCoordinates(
        location.coordinates.lat,
        location.coordinates.lng
      );

      if (coordinateRegion && coordinateRegion !== expectedRegion) {
        logger.debug(`Filtering out "${location.name}": coordinates (${location.coordinates.lat}, ${location.coordinates.lng}) are in "${coordinateRegion}", not "${expectedRegion}"`);
        return false;
      }
    }
  }

  // 3. Check distance from city center
  const cityCenter = CITY_CENTER_COORDINATES[cityKey];
  if (cityCenter && location.coordinates) {
    const distanceKm = calculateDistance(cityCenter, location.coordinates);
    if (distanceKm > MAX_DISTANCE_FROM_CITY_KM) {
      logger.debug(`Filtering out "${location.name}": ${distanceKm.toFixed(1)}km from ${cityKey} center (max ${MAX_DISTANCE_FROM_CITY_KM}km)`);
      return false;
    }
  }

  return true;
}
