/**
 * Region aggregation utilities for Trip Builder V2 map clustering.
 *
 * Groups city data by region to show aggregate statistics on region markers.
 */

import {
  type RegionId,
  type RegionData,
  REGIONS,
  REGION_NAME_TO_ID,
  getRegionsArray,
} from "@/data/regionData";
import { getCitiesByRelevance, getAllCities } from "./cityRelevance";
import type { InterestId } from "@/types/trip";

export type CityData = {
  city: string;
  relevance: number;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
};

export type RegionAggregation = {
  region: RegionData;
  cityCount: number;
  totalLocations: number;
  matchingCities: number;
  averageRelevance: number;
  hasSelectedCities: boolean;
  selectedCityCount: number;
  cities: CityData[];
};

/**
 * Aggregate city data by region for map clustering.
 *
 * @param selectedInterests - Currently selected interest IDs
 * @param selectedCities - Set of selected city names
 * @param minRelevance - Minimum relevance threshold for "matching" cities
 * @returns Map of region ID to aggregated data
 */
export function aggregateCitiesByRegion(
  selectedInterests: InterestId[],
  selectedCities: Set<string>,
  minRelevance: number = 50
): Map<RegionId, RegionAggregation> {
  const hasInterests = selectedInterests.length > 0;
  const result = new Map<RegionId, RegionAggregation>();

  // Initialize all regions
  for (const region of getRegionsArray()) {
    result.set(region.id, {
      region,
      cityCount: 0,
      totalLocations: 0,
      matchingCities: 0,
      averageRelevance: 0,
      hasSelectedCities: false,
      selectedCityCount: 0,
      cities: [],
    });
  }

  // Get city data with relevance
  const cities = hasInterests
    ? getCitiesByRelevance(selectedInterests)
    : getAllCities().map((c) => ({
        ...c,
        relevance: 0,
        interestCounts: {} as Record<string, number>,
      }));

  // Aggregate by region
  for (const city of cities) {
    if (!city.region) continue;

    const regionId = REGION_NAME_TO_ID[city.region];
    if (!regionId) continue;

    const agg = result.get(regionId);
    if (!agg) continue;

    const isSelected = selectedCities.has(city.city);
    const isMatching = hasInterests && city.relevance >= minRelevance;

    agg.cityCount++;
    agg.totalLocations += city.locationCount;
    if (isMatching) agg.matchingCities++;
    if (isSelected) {
      agg.hasSelectedCities = true;
      agg.selectedCityCount++;
    }

    agg.cities.push({
      city: city.city,
      relevance: city.relevance,
      locationCount: city.locationCount,
      coordinates: city.coordinates,
      region: city.region,
    });
  }

  // Calculate average relevance for each region
  for (const [, agg] of result) {
    if (hasInterests && agg.cities.length > 0) {
      const totalRelevance = agg.cities.reduce((sum, c) => sum + c.relevance, 0);
      agg.averageRelevance = Math.round(totalRelevance / agg.cities.length);
    }

    // Sort cities by relevance then location count
    agg.cities.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return b.locationCount - a.locationCount;
    });
  }

  return result;
}

/**
 * Get cities for a specific region.
 *
 * @param regionId - The region ID to filter by
 * @param selectedInterests - Currently selected interest IDs
 * @param selectedCities - Set of selected city names
 * @param minRelevance - Minimum relevance for display (cities below this still shown but dimmed)
 * @returns Array of city data for the region
 */
export function getCitiesForRegion(
  regionId: RegionId,
  selectedInterests: InterestId[],
  selectedCities: Set<string>,
  minRelevance: number = 0
): Array<CityData & { isSelected: boolean }> {
  const hasInterests = selectedInterests.length > 0;
  const regionName = REGIONS[regionId].name;

  const cities = hasInterests
    ? getCitiesByRelevance(selectedInterests)
    : getAllCities().map((c) => ({
        ...c,
        relevance: 0,
        interestCounts: {} as Record<string, number>,
      }));

  return cities
    .filter((c) => c.region === regionName)
    .filter((c) => c.coordinates && c.relevance >= minRelevance)
    .map((c) => ({
      city: c.city,
      relevance: c.relevance,
      locationCount: c.locationCount,
      coordinates: c.coordinates,
      region: c.region,
      isSelected: selectedCities.has(c.city),
    }));
}

/**
 * Get region bounds as a Mapbox LngLatBounds-compatible array.
 *
 * @param regionId - The region ID
 * @returns Bounds as [[west, south], [east, north]]
 */
export function getRegionBoundsArray(
  regionId: RegionId
): [[number, number], [number, number]] {
  const region = REGIONS[regionId];
  return [
    [region.bounds.west, region.bounds.south],
    [region.bounds.east, region.bounds.north],
  ];
}

/**
 * Get the center coordinates for a region.
 *
 * @param regionId - The region ID
 * @returns Center as [lng, lat]
 */
export function getRegionCenter(regionId: RegionId): [number, number] {
  const region = REGIONS[regionId];
  return [region.center.lng, region.center.lat];
}

/**
 * Determine which region a city belongs to by name.
 *
 * @param regionName - The region name from city metadata
 * @returns Region ID or undefined
 */
export function getRegionIdFromName(regionName: string): RegionId | undefined {
  return REGION_NAME_TO_ID[regionName];
}
