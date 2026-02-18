import type { CityId } from "@/types/trip";
import { REGIONS } from "./regions";
import { calculateDistanceMeters } from "@/lib/utils/geoUtils";

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 * @deprecated Use `calculateDistanceMeters` from `@/lib/utils/geoUtils` directly.
 */
export function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
): number {
  return calculateDistanceMeters(coord1, coord2);
}

/**
 * Approximate city center coordinates
 */
export function getCityCenterCoordinates(cityId: CityId): { lat: number; lng: number } {
  const centers: Record<string, { lat: number; lng: number }> = {
    kyoto: { lat: 35.0116, lng: 135.7681 },
    osaka: { lat: 34.6937, lng: 135.5023 },
    nara: { lat: 34.6851, lng: 135.8048 },
    tokyo: { lat: 35.6762, lng: 139.6503 },
    yokohama: { lat: 35.4437, lng: 139.638 },
    nagoya: { lat: 35.1815, lng: 136.9066 },
    sapporo: { lat: 43.0618, lng: 141.3545 },
    fukuoka: { lat: 33.5904, lng: 130.4017 },
    hiroshima: { lat: 34.3853, lng: 132.4553 },
    sendai: { lat: 38.2682, lng: 140.8694 },
    kanazawa: { lat: 36.5613, lng: 136.6562 },
    naha: { lat: 26.2124, lng: 127.6792 },
    hakodate: { lat: 41.7686, lng: 140.7288 },
    matsuyama: { lat: 33.8416, lng: 132.7656 },
    takamatsu: { lat: 34.3428, lng: 134.0468 },
    nagasaki: { lat: 32.7503, lng: 129.8779 },
    kobe: { lat: 34.6901, lng: 135.1956 },
  };
  return centers[cityId] ?? { lat: 35.0, lng: 135.0 };
}

/**
 * Find the nearest city to given coordinates
 */
export function getNearestCity(coordinates: { lat: number; lng: number }): CityId | undefined {
  let nearestCity: CityId | undefined;
  let minDistance = Infinity;

  for (const region of REGIONS) {
    for (const city of region.cities) {
      const cityCoords = getCityCenterCoordinates(city.id);
      const distance = calculateDistance(coordinates, cityCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city.id;
      }
    }
  }

  return nearestCity;
}
