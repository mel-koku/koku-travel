import type { CityId } from "@/types/trip";

/**
 * Day trip configuration for a destination city
 */
export type DayTripConfig = {
  /**
   * Target city ID for the day trip
   */
  cityId: CityId;
  /**
   * Approximate one-way travel time in minutes
   */
  travelMinutes: number;
  /**
   * Minimum number of days in base city before suggesting this day trip
   * This ensures travelers get a solid experience of the base city first
   */
  minDaysBeforeSuggesting: number;
  /**
   * Brief description for UI display
   */
  description?: string;
};

/**
 * Day trip mappings from base cities to nearby destinations.
 * These are used to provide variety for extended single-city stays
 * and to suggest efficient day trips based on travel times.
 *
 * Cities are ordered by travel time (closest first) for each base city.
 */
export const DAY_TRIP_MAPPINGS: Record<CityId, DayTripConfig[]> = {
  // Kansai region
  kyoto: [
    {
      cityId: "nara",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 4,
      description: "Ancient temples and friendly deer",
    },
    {
      cityId: "osaka",
      travelMinutes: 30,
      minDaysBeforeSuggesting: 5,
      description: "Vibrant food scene and modern attractions",
    },
  ],
  osaka: [
    {
      cityId: "kyoto",
      travelMinutes: 30,
      minDaysBeforeSuggesting: 3,
      description: "Historic temples and traditional culture",
    },
    {
      cityId: "nara",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 4,
      description: "Ancient capital with deer park",
    },
  ],
  nara: [
    {
      cityId: "kyoto",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 2,
      description: "Temple-filled cultural capital",
    },
    {
      cityId: "osaka",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 3,
      description: "Japan's kitchen and entertainment hub",
    },
  ],
  // Kanto region
  tokyo: [
    {
      cityId: "yokohama",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 4,
      description: "Chinatown and waterfront attractions",
    },
    // Future additions when these cities are added to the database:
    // { cityId: "kamakura", travelMinutes: 60, minDaysBeforeSuggesting: 5, description: "Giant Buddha and seaside temples" },
    // { cityId: "nikko", travelMinutes: 120, minDaysBeforeSuggesting: 6, description: "UNESCO World Heritage shrines" },
  ],
  yokohama: [
    {
      cityId: "tokyo",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 3,
      description: "Japan's bustling capital",
    },
  ],
};

/**
 * Get available day trips from a base city
 * @param baseCityId - The city the traveler is staying in
 * @returns Array of day trip configurations, sorted by travel time
 */
export function getDayTripsFromCity(baseCityId: CityId): DayTripConfig[] {
  return DAY_TRIP_MAPPINGS[baseCityId] ?? [];
}

/**
 * Get day trip suggestions for a specific day number in a city
 * @param baseCityId - The base city
 * @param dayNumberInCity - How many consecutive days the traveler has been in this city
 * @returns Array of suitable day trip suggestions
 */
export function getSuggestedDayTrips(
  baseCityId: CityId,
  dayNumberInCity: number,
): DayTripConfig[] {
  const allTrips = getDayTripsFromCity(baseCityId);
  return allTrips.filter((trip) => dayNumberInCity >= trip.minDaysBeforeSuggesting);
}

/**
 * Check if a day trip should be suggested based on location exhaustion
 * @param baseCityId - The base city
 * @param dayNumberInCity - Days spent in this city
 * @param remainingLocationsInCity - How many unused locations remain
 * @param activitiesPerDay - Target activities per day
 * @returns Suggested day trip or undefined if base city has enough variety
 */
export function shouldSuggestDayTrip(
  baseCityId: CityId,
  dayNumberInCity: number,
  remainingLocationsInCity: number,
  activitiesPerDay: number = 3,
): DayTripConfig | undefined {
  // Suggest day trips when running low on locations (less than 5 days worth).
  // The threshold is generous because the generator's filtering (geographic
  // validation, name dedup, interest matching) reduces effective availability
  // well below the raw unused count.
  const locationsNeeded = activitiesPerDay * 5;
  const isRunningLow = remainingLocationsInCity < locationsNeeded;

  if (!isRunningLow) return undefined;

  const availableTrips = getSuggestedDayTrips(baseCityId, dayNumberInCity);
  return availableTrips[0];
}

/**
 * Calculate total travel overhead for a day trip (round trip in minutes)
 */
export function getDayTripTravelOverhead(trip: DayTripConfig): number {
  return trip.travelMinutes * 2;
}
