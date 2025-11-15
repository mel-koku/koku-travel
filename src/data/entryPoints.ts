import type { CityId, EntryPoint, EntryPointType } from "@/types/trip";
import { REGIONS } from "./regions";

/**
 * Major airports in Japan with coordinates
 */
const AIRPORTS: EntryPoint[] = [
  {
    type: "airport",
    id: "kix",
    name: "Kansai International Airport (KIX)",
    coordinates: { lat: 34.4273, lng: 135.2441 },
    cityId: "osaka",
  },
  {
    type: "airport",
    id: "nrt",
    name: "Narita International Airport (NRT)",
    coordinates: { lat: 35.772, lng: 140.3929 },
    cityId: "tokyo",
  },
  {
    type: "airport",
    id: "hnd",
    name: "Haneda Airport (HND)",
    coordinates: { lat: 35.5494, lng: 139.7798 },
    cityId: "tokyo",
  },
  {
    type: "airport",
    id: "itm",
    name: "Osaka International Airport (ITM)",
    coordinates: { lat: 34.7855, lng: 135.4382 },
    cityId: "osaka",
  },
];

/**
 * City entry points (using existing city data)
 */
const CITY_ENTRY_POINTS: EntryPoint[] = REGIONS.flatMap((region) =>
  region.cities.map((city) => ({
    type: "city" as const,
    id: `city-${city.id}`,
    name: city.name,
    coordinates: getCityCenterCoordinates(city.id),
    cityId: city.id,
  })),
);

/**
 * Hotel entry points (placeholder structure - can be extended when hotel data is available)
 */
const HOTELS: EntryPoint[] = [
  // Placeholder structure - can be populated when hotel data is available
  // Example:
  // {
  //   type: "hotel",
  //   id: "hotel-123",
  //   name: "Example Hotel",
  //   coordinates: { lat: 35.0, lng: 135.0 },
  //   cityId: "kyoto",
  // },
];

/**
 * Approximate city center coordinates
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
 * All entry points combined
 */
const ALL_ENTRY_POINTS: EntryPoint[] = [...AIRPORTS, ...CITY_ENTRY_POINTS, ...HOTELS];

/**
 * Get an entry point by its ID
 */
export function getEntryPointById(id: string): EntryPoint | undefined {
  return ALL_ENTRY_POINTS.find((ep) => ep.id === id);
}

/**
 * Get all entry points of a specific type
 */
export function getEntryPointsByType(type: EntryPointType): EntryPoint[] {
  return ALL_ENTRY_POINTS.filter((ep) => ep.type === type);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
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
 * Find the nearest city to an entry point
 */
export function getNearestCity(entryPoint: EntryPoint): CityId | undefined {
  if (entryPoint.cityId) {
    return entryPoint.cityId;
  }

  let nearestCity: CityId | undefined;
  let minDistance = Infinity;

  for (const region of REGIONS) {
    for (const city of region.cities) {
      const cityCoords = getCityCenterCoordinates(city.id);
      const distance = calculateDistance(entryPoint.coordinates, cityCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city.id;
      }
    }
  }

  return nearestCity;
}

/**
 * Get all available entry points
 */
export function getAllEntryPoints(): EntryPoint[] {
  return [...ALL_ENTRY_POINTS];
}

