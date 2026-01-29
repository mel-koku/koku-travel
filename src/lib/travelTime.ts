import type { CityId, EntryPoint } from "../types/trip";
import { getNearestCity } from "@/data/entryPoints";

const MATRIX: Record<CityId, Partial<Record<CityId, number>>> = {
  kyoto: { osaka: 30, nara: 45, tokyo: 150 },
  osaka: { kyoto: 30, nara: 45, tokyo: 150 },
  nara: { kyoto: 45, osaka: 45, tokyo: 180 },
  tokyo: { kyoto: 150, osaka: 150, yokohama: 25 },
  yokohama: { tokyo: 25 },
};

/**
 * Returns the approximate travel time in minutes between two cities.
 * Falls back to the inverse lookup if only one direction is defined.
 */
export function travelMinutes(a: CityId, b: CityId): number | undefined {
  if (a === b) return 0;
  return MATRIX[a]?.[b] ?? MATRIX[b]?.[a];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistanceMeters(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get city center coordinates for travel time estimation
 */
function getCityCenterCoordinates(cityId: CityId): { lat: number; lng: number } {
  const centers: Record<CityId, { lat: number; lng: number }> = {
    kyoto: { lat: 35.0116, lng: 135.7681 },
    osaka: { lat: 34.6937, lng: 135.5023 },
    nara: { lat: 34.6851, lng: 135.8048 },
    tokyo: { lat: 35.6762, lng: 139.6503 },
    yokohama: { lat: 35.4437, lng: 139.638 },
  };
  return centers[cityId] ?? { lat: 35.0, lng: 135.0 };
}

/**
 * Estimate travel time from an entry point to a city in minutes.
 * Uses distance-based estimation with mode-specific speeds.
 */
export function travelTimeFromEntryPoint(
  entryPoint: EntryPoint,
  cityId: CityId,
): number | undefined {
  // If entry point already has a city ID and it matches, return 0
  if (entryPoint.cityId === cityId) {
    return 0;
  }

  const cityCoords = getCityCenterCoordinates(cityId);
  const distanceMeters = calculateDistanceMeters(entryPoint.coordinates, cityCoords);

  // Estimate travel time based on distance
  // Airports: assume train/bus (average 60 km/h for inter-city)
  // For very long distances (inter-region), use faster shinkansen speed
  const averageSpeedKmh = distanceMeters > 100000 ? 200 : 60;

  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.round(hours * 60);

  // Add buffer time for airport transfers (check-in, security, etc.)
  if (entryPoint.type === "airport") {
    return minutes + 30; // Add 30 minutes for airport transfer
  }

  return minutes;
}

/**
 * Get the nearest city to an entry point
 */
export function getNearestCityToEntryPoint(entryPoint: EntryPoint): CityId | undefined {
  return getNearestCity(entryPoint.coordinates);
}


