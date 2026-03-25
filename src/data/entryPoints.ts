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
    // Kansai
    kyoto: { lat: 35.0116, lng: 135.7681 },
    osaka: { lat: 34.6937, lng: 135.5023 },
    nara: { lat: 34.6851, lng: 135.8048 },
    kobe: { lat: 34.6901, lng: 135.1956 },
    otsu: { lat: 35.0045, lng: 135.8686 },
    // Kanto
    tokyo: { lat: 35.6762, lng: 139.6503 },
    yokohama: { lat: 35.4437, lng: 139.638 },
    kamakura: { lat: 35.3192, lng: 139.5467 },
    nikko: { lat: 36.7500, lng: 139.5987 },
    hakone: { lat: 35.2323, lng: 139.1069 },
    // Chubu
    nagoya: { lat: 35.1815, lng: 136.9066 },
    kanazawa: { lat: 36.5613, lng: 136.6562 },
    takayama: { lat: 36.1461, lng: 137.2523 },
    nagano: { lat: 36.6485, lng: 138.1949 },
    niigata: { lat: 37.9162, lng: 139.0364 },
    // Kyushu
    fukuoka: { lat: 33.5904, lng: 130.4017 },
    nagasaki: { lat: 32.7503, lng: 129.8779 },
    kumamoto: { lat: 32.8032, lng: 130.7079 },
    kagoshima: { lat: 31.5966, lng: 130.5571 },
    oita: { lat: 33.2382, lng: 131.6126 },
    // Hokkaido
    sapporo: { lat: 43.0618, lng: 141.3545 },
    hakodate: { lat: 41.7686, lng: 140.7288 },
    // Tohoku
    sendai: { lat: 38.2682, lng: 140.8694 },
    morioka: { lat: 39.7036, lng: 141.1527 },
    aomori: { lat: 40.8244, lng: 140.7400 },
    akita: { lat: 39.7200, lng: 140.1023 },
    // Chugoku
    hiroshima: { lat: 34.3853, lng: 132.4553 },
    okayama: { lat: 34.6551, lng: 133.9195 },
    matsue: { lat: 35.4723, lng: 133.0505 },
    tottori: { lat: 35.5011, lng: 134.2351 },
    // Shikoku
    matsuyama: { lat: 33.8416, lng: 132.7656 },
    takamatsu: { lat: 34.3428, lng: 134.0468 },
    tokushima: { lat: 34.0658, lng: 134.5593 },
    kochi: { lat: 33.5597, lng: 133.5311 },
    // Okinawa
    naha: { lat: 26.2124, lng: 127.6792 },
    ishigaki: { lat: 24.3344, lng: 124.1841 },
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
