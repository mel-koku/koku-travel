/**
 * City relevance calculation utilities for the trip builder.
 *
 * Uses pre-computed city-interest mapping to calculate how well
 * a city matches a user's selected interests.
 */

import type { InterestId } from "@/types/trip";

// Lazy-load 220KB JSON to keep it out of the initial client bundle.
// The data is cached after first import so subsequent calls are instant.
let _cityInterestsData: CityInterestsJson | null = null;

function getCityInterestsData(): CityInterestsJson {
  if (!_cityInterestsData) {
    // Dynamic require for synchronous access after first load.
    // Next.js will code-split this into a separate chunk.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _cityInterestsData = require("@/data/cityInterests.json") as CityInterestsJson;
  }
  return _cityInterestsData;
}

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
 * Calculate the total number of matching locations in a city for selected interests.
 *
 * @param city - The city name
 * @param selectedInterests - Array of selected interest IDs
 * @returns Total count of locations matching any selected interest
 */
export function calculateTotalMatchingLocations(
  city: string,
  selectedInterests: InterestId[]
): number {
  if (selectedInterests.length === 0) {
    return 0;
  }

  const data = getCityInterestsData();
  const cityData = data.cities[city];
  if (!cityData) {
    return 0;
  }

  let total = 0;
  for (const interest of selectedInterests) {
    const count = cityData[interest as keyof typeof cityData];
    if (count && count > 0) {
      total += count;
    }
  }

  return total;
}

/**
 * Calculate the relevance percentage of a city based on selected interests.
 *
 * @deprecated Use getCitiesByRelevance() which calculates relevance relative to max matching count.
 * This function is kept for backwards compatibility but returns a simple binary relevance.
 *
 * @param city - The city name
 * @param selectedInterests - Array of selected interest IDs
 * @returns Relevance percentage (0-100)
 */
export function calculateCityRelevance(city: string, selectedInterests: InterestId[]): number {
  if (selectedInterests.length === 0) {
    return 0;
  }

  const data = getCityInterestsData();
  const cityData = data.cities[city];
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
 * Relevance is calculated as a percentage relative to the city with the most
 * matching locations. The city with the highest matching location count gets 100%.
 *
 * @param selectedInterests - Array of selected interest IDs
 * @returns Array of cities with relevance data, sorted by matching location count
 */
export function getCitiesByRelevance(selectedInterests: InterestId[]): Array<{
  city: string;
  relevance: number;
  matchingLocationCount: number;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
  interestCounts: Record<string, number>;
}> {
  const data = getCityInterestsData();
  const cities = Object.keys(data.cities);

  // First pass: calculate matching location counts for all cities
  const citiesWithCounts = cities.map((city) => {
    const matchingLocationCount = calculateTotalMatchingLocations(city, selectedInterests);
    const metadata = data.metadata[city];
    const interestCounts = data.cities[city] || {};

    return {
      city,
      matchingLocationCount,
      locationCount: metadata?.locationCount ?? 0,
      coordinates: metadata?.coordinates,
      region: metadata?.region,
      interestCounts: interestCounts as Record<string, number>,
    };
  });

  // Find max matching count for normalization (minimum of 1 to avoid division by zero)
  const maxCount = Math.max(1, ...citiesWithCounts.map((c) => c.matchingLocationCount));

  // Calculate relative relevance as percentage of max
  const citiesWithRelevance = citiesWithCounts.map((c) => ({
    ...c,
    relevance: Math.round((c.matchingLocationCount / maxCount) * 100),
  }));

  // Sort by matching location count (descending), then by total location count (descending)
  citiesWithRelevance.sort((a, b) => {
    if (b.matchingLocationCount !== a.matchingLocationCount) {
      return b.matchingLocationCount - a.matchingLocationCount;
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
    const data = getCityInterestsData();
    return Object.keys(data.cities)
      .map((city) => ({
        city,
        relevance: 0,
        matchingLocationCount: 0,
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
  const data = getCityInterestsData();
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
  const data = getCityInterestsData();
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
  const data = getCityInterestsData();
  return {
    totalLocations: data.totalLocations,
    totalCities: data.totalCities,
    generatedAt: data.generatedAt,
  };
}
