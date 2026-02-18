/**
 * Geographic utility functions for calculating distances and travel times.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @param coord1 First coordinate point
 * @param coord2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @param coord1 First coordinate point
 * @param coord2 Second coordinate point
 * @returns Distance in meters
 */
export function calculateDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates,
): number {
  return calculateDistance(coord1, coord2) * 1000;
}

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance and mode.
 * @param distanceKm Distance in kilometers
 * @param mode Transportation mode
 * @returns Time in minutes
 */
export function estimateTravelTime(
  distanceKm: number,
  mode: "walk" | "transit" | "taxi" = "walk",
): number {
  const speeds = {
    walk: 4, // 4 km/h
    transit: 20, // 20 km/h including wait time
    taxi: 30, // 30 km/h in city traffic
  };

  const hours = distanceKm / speeds[mode];
  const minutes = hours * 60;

  // Add buffer for complexity
  const buffer = mode === "transit" ? 10 : 5;
  return Math.ceil(minutes + buffer);
}

