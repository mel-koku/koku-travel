/**
 * City relevance calculation utilities for the trip builder.
 *
 * Uses pre-computed city-interest mapping to calculate how well
 * a city matches a user's selected interests.
 */

import type { InterestId } from "@/types/trip";
import cityInterestsData from "@/data/cityInterests.json";

type CityInterestCounts = Record<string, number>;
type CityMetadataEntry = {
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
};

type CityInterestsJson = {
  generatedAt: string;
  totalLocations: number;
  totalCities: number;
  cities: Record<string, CityInterestCounts>;
  metadata: Record<string, CityMetadataEntry>;
};

/**
 * Calculate the relevance percentage of a city based on selected interests.
 *
 * Formula: % of user's selected interests that have at least 1 location in that city.
 *
 * @param city - The city name
 * @param selectedInterests - Array of selected interest IDs
 * @returns Relevance percentage (0-100)
 */
export function calculateCityRelevance(city: string, selectedInterests: InterestId[]): number {
  if (selectedInterests.length === 0) {
    return 0;
  }

  const cityData = (cityInterestsData as CityInterestsJson).cities[city];
  if (!cityData) {
    return 0;
  }

  let matchingInterests = 0;
  for (const interest of selectedInterests) {
    const count = cityData[interest as keyof typeof cityData];
    if (count && count > 0) {
      matchingInterests++;
    }
  }

  return Math.round((matchingInterests / selectedInterests.length) * 100);
}

/**
 * Get all cities sorted by relevance to selected interests.
 *
 * @param selectedInterests - Array of selected interest IDs
 * @returns Array of cities with relevance data, sorted by relevance
 */
export function getCitiesByRelevance(selectedInterests: InterestId[]): Array<{
  city: string;
  relevance: number;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
  interestCounts: Record<string, number>;
}> {
  const data = cityInterestsData as CityInterestsJson;
  const cities = Object.keys(data.cities);

  const citiesWithRelevance = cities.map((city) => {
    const relevance = calculateCityRelevance(city, selectedInterests);
    const metadata = data.metadata[city];
    const interestCounts = data.cities[city] || {};

    return {
      city,
      relevance,
      locationCount: metadata?.locationCount ?? 0,
      coordinates: metadata?.coordinates,
      region: metadata?.region,
      interestCounts: interestCounts as Record<string, number>,
    };
  });

  // Sort by relevance (descending), then by location count (descending)
  citiesWithRelevance.sort((a, b) => {
    if (b.relevance !== a.relevance) {
      return b.relevance - a.relevance;
    }
    return b.locationCount - a.locationCount;
  });

  return citiesWithRelevance;
}

/**
 * Get cities that match at least the minimum relevance threshold.
 *
 * @param selectedInterests - Array of selected interest IDs
 * @param minRelevance - Minimum relevance percentage (default: 50)
 * @returns Filtered and sorted cities
 */
export function getRelevantCities(
  selectedInterests: InterestId[],
  minRelevance: number = 50
): ReturnType<typeof getCitiesByRelevance> {
  if (selectedInterests.length === 0) {
    // Return top cities by location count when no interests selected
    const data = cityInterestsData as CityInterestsJson;
    return Object.keys(data.cities)
      .map((city) => ({
        city,
        relevance: 0,
        locationCount: data.metadata[city]?.locationCount ?? 0,
        coordinates: data.metadata[city]?.coordinates,
        region: data.metadata[city]?.region,
        interestCounts: data.cities[city] as Record<string, number>,
      }))
      .sort((a, b) => b.locationCount - a.locationCount);
  }

  return getCitiesByRelevance(selectedInterests).filter((c) => c.relevance >= minRelevance);
}

/**
 * Get suggested cities when selected interests don't match any cities well.
 * Expands search to include cities with partial matches.
 *
 * @param selectedInterests - Array of selected interest IDs
 * @param count - Number of suggestions to return (default: 10)
 * @returns Top cities by relevance, even with low match
 */
export function getSuggestedCities(
  selectedInterests: InterestId[],
  count: number = 10
): ReturnType<typeof getCitiesByRelevance> {
  return getCitiesByRelevance(selectedInterests).slice(0, count);
}

/**
 * Get all available cities with their metadata.
 */
export function getAllCities(): Array<{
  city: string;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
}> {
  const data = cityInterestsData as CityInterestsJson;
  return Object.keys(data.metadata)
    .map((city) => ({
      city,
      locationCount: data.metadata[city]?.locationCount ?? 0,
      coordinates: data.metadata[city]?.coordinates,
      region: data.metadata[city]?.region,
    }))
    .sort((a, b) => b.locationCount - a.locationCount);
}

/**
 * Get city metadata by name.
 */
export function getCityMetadata(city: string): {
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
} | null {
  const data = cityInterestsData as CityInterestsJson;
  const metadata = data.metadata[city];
  if (!metadata) {
    return null;
  }
  return {
    locationCount: metadata.locationCount,
    coordinates: metadata.coordinates,
    region: metadata.region,
  };
}

/**
 * Get total statistics from the city interests data.
 */
export function getCityInterestsStats(): {
  totalLocations: number;
  totalCities: number;
  generatedAt: string;
} {
  const data = cityInterestsData as CityInterestsJson;
  return {
    totalLocations: data.totalLocations,
    totalCities: data.totalCities,
    generatedAt: data.generatedAt,
  };
}
