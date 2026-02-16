import type { KnownCityId, KnownRegionId, CityId, RegionId } from "../types/trip";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";

export type Region = {
  id: KnownRegionId;
  name: string;
  cities: {
    id: KnownCityId;
    name: string;
  }[];
};

/**
 * Japan's 9 main regions with their major cities.
 *
 * This list is used for:
 * 1. Itinerary generation - grouping cities by region for efficient travel
 * 2. City-region validation - ensuring locations are in the correct region
 * 3. Trip builder UI - showing regional groupings
 *
 * Note: The region names here should match the "region" field in the locations table.
 */
export const REGIONS: readonly Region[] = [
  {
    id: "kansai",
    name: "Kansai",
    cities: [
      { id: "kyoto", name: "Kyoto" },
      { id: "osaka", name: "Osaka" },
      { id: "nara", name: "Nara" },
      { id: "kobe", name: "Kobe" },
    ],
  },
  {
    id: "kanto",
    name: "Kanto",
    cities: [
      { id: "tokyo", name: "Tokyo" },
      { id: "yokohama", name: "Yokohama" },
    ],
  },
  {
    id: "chubu",
    name: "Chubu",
    cities: [
      { id: "nagoya", name: "Nagoya" },
      { id: "kanazawa", name: "Kanazawa" },
    ],
  },
  {
    id: "kyushu",
    name: "Kyushu",
    cities: [
      { id: "fukuoka", name: "Fukuoka" },
      { id: "nagasaki", name: "Nagasaki" },
    ],
  },
  {
    id: "hokkaido",
    name: "Hokkaido",
    cities: [
      { id: "sapporo", name: "Sapporo" },
      { id: "hakodate", name: "Hakodate" },
    ],
  },
  {
    id: "tohoku",
    name: "Tohoku",
    cities: [
      { id: "sendai", name: "Sendai" },
    ],
  },
  {
    id: "chugoku",
    name: "Chugoku",
    cities: [
      { id: "hiroshima", name: "Hiroshima" },
    ],
  },
  {
    id: "shikoku",
    name: "Shikoku",
    cities: [
      { id: "matsuyama", name: "Matsuyama" },
      { id: "takamatsu", name: "Takamatsu" },
    ],
  },
  {
    id: "okinawa",
    name: "Okinawa",
    cities: [
      { id: "naha", name: "Naha" },
    ],
  },
] as const;

export const ALL_CITY_IDS = REGIONS.flatMap((region) =>
  region.cities.map((city) => city.id)
) as readonly KnownCityId[];

export const CITY_TO_REGION: Record<KnownCityId, KnownRegionId> = REGIONS.reduce(
  (acc, region) => {
    region.cities.forEach((city) => {
      acc[city.id] = region.id;
    });
    return acc;
  },
  {} as Record<KnownCityId, KnownRegionId>,
);

/**
 * Check if a city ID is a known static city
 */
export function isKnownCity(cityId: string): cityId is KnownCityId {
  return ALL_CITY_IDS.includes(cityId as KnownCityId);
}

/** Map from lowercase region name to region ID for dynamic city lookup */
const REGION_NAME_TO_ID = new Map<string, KnownRegionId>(
  REGIONS.map((r) => [r.name.toLowerCase(), r.id])
);

/**
 * Get the region for a city, returns undefined for unknown cities.
 * Falls back to cityInterests metadata for dynamic (non-known) cities.
 */
export function getRegionForCity(cityId: CityId): RegionId | undefined {
  if (isKnownCity(cityId)) {
    return CITY_TO_REGION[cityId];
  }
  // Dynamic city — look up region from cityInterests metadata
  const meta = getCityMetadata(cityId);
  if (meta?.region) {
    return REGION_NAME_TO_ID.get(meta.region.toLowerCase());
  }
  return undefined;
}

/**
 * Derive unique region IDs from a list of selected cities.
 * Used to keep `data.regions` in sync when selection is city-driven.
 * Supports both known (17 static) and dynamic cities via metadata lookup.
 */
export function deriveRegionsFromCities(cityIds: CityId[]): KnownRegionId[] {
  const regionSet = new Set<KnownRegionId>();
  for (const cityId of cityIds) {
    if (isKnownCity(cityId)) {
      regionSet.add(CITY_TO_REGION[cityId]);
    } else {
      const regionId = getRegionForCity(cityId);
      if (regionId && REGION_NAME_TO_ID.has(regionId) || REGIONS.some((r) => r.id === regionId)) {
        regionSet.add(regionId as KnownRegionId);
      }
    }
  }
  return Array.from(regionSet);
}
