import { getRegionForCity, REGIONS } from "@/data/regions";
import { shouldSuggestDayTrip, getDayTripTravelOverhead, type DayTripConfig } from "@/data/dayTrips";
import type { Itinerary, ItineraryTravelMode } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { CityId, InterestId, RegionId, TripBuilderData } from "@/types/trip";
import type { WeatherForecast, TripWeatherContext } from "@/types/weather";
import { getNearestCityToEntryPoint, travelMinutes } from "./travelTime";
import { getCategoryDefaultDuration } from "./durationExtractor";
import { scoreLocation, type LocationScoringCriteria } from "@/lib/scoring/locationScoring";
import { applyDiversityFilter, type DiversityContext } from "@/lib/scoring/diversityRules";
import { checkOpeningHoursFit } from "@/lib/scoring/timeOptimization";
import { fetchWeatherForecast } from "./weather/weatherService";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import { calculateDistance } from "@/lib/utils/geoUtils";

const TIME_OF_DAY_SEQUENCE = ["morning", "afternoon", "evening"] as const;
const DEFAULT_TOTAL_DAYS = 5;
const DEFAULT_CITY_ROTATION: readonly CityId[] = ["kyoto", "tokyo", "osaka"] as const;
const DEFAULT_INTEREST_ROTATION: readonly InterestId[] = ["culture", "food", "nature", "shopping"];

// Time slot capacities in minutes (9am-9pm day)
const TIME_SLOT_CAPACITIES = {
  morning: 180, // 9am-12pm (3 hours)
  afternoon: 300, // 12pm-5pm (5 hours)
  evening: 240, // 5pm-9pm (4 hours)
} as const;

// Travel pace multipliers (how much of the time slot capacity to use)
const PACE_MULTIPLIERS = {
  relaxed: 0.65, // Use 65% of capacity (more downtime)
  balanced: 0.82, // Use 82% of capacity (comfortable pace)
  fast: 0.92, // Use 92% of capacity (packed schedule)
} as const;

// Average travel time between locations (in minutes)
const TRAVEL_TIME_BY_PACE = {
  relaxed: 25, // More leisurely travel
  balanced: 20, // Standard travel time
  fast: 15, // Quick transitions
} as const;

type LocationCategory = Location["category"];

type CityInfo = {
  key: string;
  label: string;
  regionId?: RegionId;
};

// =============================================================================
// GEOGRAPHIC VALIDATION CONSTANTS
// =============================================================================

/**
 * Maximum distance (in km) from city center for a location to be considered valid.
 * Locations beyond this distance are filtered out to prevent cross-region recommendations.
 */
const MAX_DISTANCE_FROM_CITY_KM = 100;

/**
 * City center coordinates for distance validation.
 * Used to ensure locations are within reasonable distance of the selected city.
 */
const CITY_CENTER_COORDINATES: Record<string, { lat: number; lng: number }> = {
  tokyo: { lat: 35.6762, lng: 139.6503 },
  yokohama: { lat: 35.4437, lng: 139.6380 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  nara: { lat: 34.6851, lng: 135.8048 },
  kobe: { lat: 34.6901, lng: 135.1956 },
  nagoya: { lat: 35.1815, lng: 136.9066 },
  fukuoka: { lat: 33.5904, lng: 130.4017 },
  sapporo: { lat: 43.0618, lng: 141.3545 },
  sendai: { lat: 38.2682, lng: 140.8694 },
  hiroshima: { lat: 34.3853, lng: 132.4553 },
  kanazawa: { lat: 36.5613, lng: 136.6562 },
  naha: { lat: 26.2124, lng: 127.6809 },
};

/**
 * Expected region for each city.
 * Used to validate that locations in a city actually belong to that city's region.
 */
const CITY_EXPECTED_REGION: Record<string, string> = {
  tokyo: "Kanto",
  yokohama: "Kanto",
  osaka: "Kansai",
  kyoto: "Kansai",
  nara: "Kansai",
  kobe: "Kansai",
  nagoya: "Chubu",
  fukuoka: "Kyushu",
  sapporo: "Hokkaido",
  sendai: "Tohoku",
  hiroshima: "Chugoku",
  kanazawa: "Chubu",
  naha: "Okinawa",
};

/**
 * Region bounding boxes for coordinate-based validation.
 */
const REGION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  Hokkaido: { north: 45.5, south: 41.4, east: 145.9, west: 139.3 },
  Tohoku: { north: 41.5, south: 37.0, east: 142.1, west: 139.0 },
  Kanto: { north: 37.0, south: 34.5, east: 140.9, west: 138.2 },
  Chubu: { north: 37.5, south: 34.5, east: 139.2, west: 135.8 },
  Kansai: { north: 36.0, south: 33.4, east: 136.8, west: 134.0 },
  Chugoku: { north: 36.0, south: 33.5, east: 134.5, west: 130.8 },
  Shikoku: { north: 34.5, south: 32.7, east: 134.8, west: 132.0 },
  Kyushu: { north: 34.3, south: 31.0, east: 132.1, west: 129.5 },
  Okinawa: { north: 27.5, south: 24.0, east: 131.5, west: 122.9 },
};

/**
 * Check if coordinates fall within a region's bounding box.
 */
function isWithinRegionBounds(
  lat: number,
  lng: number,
  regionName: string
): boolean {
  const bounds = REGION_BOUNDS[regionName];
  if (!bounds) return true; // Allow if region not found
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}
void isWithinRegionBounds; // Reserved for future use

/**
 * Find which region contains the given coordinates.
 */
function findRegionByCoordinates(lat: number, lng: number): string | null {
  for (const [region, bounds] of Object.entries(REGION_BOUNDS)) {
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return region;
    }
  }
  return null;
}

/**
 * Validate that a location is geographically appropriate for a city.
 * Returns true if the location should be included, false if it should be filtered out.
 *
 * This prevents data corruption issues where locations like "Cape Higashi, Osaka, Okinawa"
 * are incorrectly recommended for Osaka because the city field says "Osaka" but the
 * coordinates are in Okinawa.
 */
function isLocationValidForCity(
  location: Location,
  cityKey: string,
  expectedRegionId?: RegionId
): boolean {
  // 1. Check region consistency
  const expectedRegion = expectedRegionId
    ? REGIONS.find((r) => r.id === expectedRegionId)?.name
    : CITY_EXPECTED_REGION[cityKey];

  if (expectedRegion && location.region) {
    // If location's region doesn't match expected region for this city, reject it
    if (location.region !== expectedRegion) {
      logger.debug(`Filtering out "${location.name}": region "${location.region}" doesn't match expected "${expectedRegion}" for city "${cityKey}"`);
      return false;
    }
  }

  // 2. Check coordinate-based region (more reliable than region field)
  if (location.coordinates) {
    const coordinateRegion = findRegionByCoordinates(
      location.coordinates.lat,
      location.coordinates.lng
    );

    if (coordinateRegion && expectedRegion && coordinateRegion !== expectedRegion) {
      logger.debug(`Filtering out "${location.name}": coordinates (${location.coordinates.lat}, ${location.coordinates.lng}) are in "${coordinateRegion}", not "${expectedRegion}"`);
      return false;
    }
  }

  // 3. Check distance from city center
  const cityCenter = CITY_CENTER_COORDINATES[cityKey];
  if (cityCenter && location.coordinates) {
    const distanceKm = calculateDistance(cityCenter, location.coordinates);
    if (distanceKm > MAX_DISTANCE_FROM_CITY_KM) {
      logger.debug(`Filtering out "${location.name}": ${distanceKm.toFixed(1)}km from ${cityKey} center (max ${MAX_DISTANCE_FROM_CITY_KM}km)`);
      return false;
    }
  }

  return true;
}

const REGION_ID_BY_LABEL = new Map<string, RegionId>();
const CITY_INFO_BY_KEY = new Map<string, CityInfo>();

REGIONS.forEach((region) => {
  REGION_ID_BY_LABEL.set(normalizeKey(region.name), region.id);
  region.cities.forEach((city) => {
    const key = normalizeKey(city.id);
    CITY_INFO_BY_KEY.set(key, { key, label: city.name, regionId: region.id });
  });
});

/**
 * Fetches locations from Supabase database.
 * In production, throws errors if database is unavailable.
 *
 * City filtering is enabled after ward consolidation (e.g., "Sakyo Ward" → "Kyoto").
 * The database now uses normalized city names that match trip builder city IDs.
 */
async function fetchAllLocations(cities?: string[]): Promise<Location[]> {
  try {
    const supabase = await createClient();
    const allLocations: Location[] = [];
    let page = 0;
    const limit = 100; // Max per page
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("locations")
        .select(LOCATION_ITINERARY_COLUMNS)
        .order("name", { ascending: true });

      // Apply city filter if cities are specified
      // Use case-insensitive matching to handle multi-word cities like "Mount Yoshino"
      if (cities && cities.length > 0) {
        // Build OR condition for case-insensitive city matching
        const cityFilters = cities.map((c) => `city.ilike.${c}`).join(",");
        query = query.or(cityFilters);
      }

      const { data, error } = await query.range(page * limit, (page + 1) * limit - 1);

      if (error) {
        const errorMessage = `Failed to fetch locations from database: ${error.message}`;
        logger.error(errorMessage, { error: error.message, page });
        throw new Error(errorMessage);
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Transform Supabase data to Location type
      const locations: Location[] = (data as unknown as LocationDbRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        region: row.region,
        city: row.city,
        neighborhood: row.neighborhood ?? undefined,
        category: row.category,
        image: row.image,
        minBudget: row.min_budget ?? undefined,
        estimatedDuration: row.estimated_duration ?? undefined,
        operatingHours: row.operating_hours ?? undefined,
        recommendedVisit: row.recommended_visit ?? undefined,
        preferredTransitModes: row.preferred_transit_modes ?? undefined,
        coordinates: row.coordinates ?? undefined,
        timezone: row.timezone ?? undefined,
        shortDescription: row.short_description ?? undefined,
        rating: row.rating ?? undefined,
        reviewCount: row.review_count ?? undefined,
        placeId: row.place_id ?? undefined,
      }));

      allLocations.push(...locations);

      // Check if there are more pages
      hasMore = data.length === limit;
      page++;

      // Safety limit to prevent infinite loops
      if (page > 100) {
        logger.warn("Reached pagination safety limit when fetching locations");
        break;
      }
    }

    if (allLocations.length === 0) {
      const errorMessage = "No locations found in database. Please ensure locations are seeded.";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.info(`Fetched ${allLocations.length} locations from database`);
    return allLocations;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof Error) {
      throw error;
    }

    // Unknown error - fail loudly
    const errorMessage = `Failed to fetch locations from database: ${String(error)}`;
    logger.error(errorMessage, { error });
    throw new Error(errorMessage);
  }
}

/**
 * Builds location maps from an array of locations.
 * Organizes locations by city and region for efficient lookup.
 */
function buildLocationMaps(locations: Location[]): {
  locationsByCityKey: Map<string, Location[]>;
  locationsByRegionId: Map<RegionId, Location[]>;
  allLocations: Location[];
} {
  const locationsByCityKey = new Map<string, Location[]>();
  const locationsByRegionId = new Map<RegionId, Location[]>();

  locations.forEach((location) => {
    const cityKey = normalizeKey(location.city);
    if (!cityKey) {
      return;
    }
    const regionIdFromLabel = REGION_ID_BY_LABEL.get(normalizeKey(location.region));
    const existingInfo = CITY_INFO_BY_KEY.get(cityKey);
    const info: CityInfo =
      existingInfo ??
      (() => {
        const fallback: CityInfo = { key: cityKey, label: location.city, regionId: regionIdFromLabel };
        CITY_INFO_BY_KEY.set(cityKey, fallback);
        return fallback;
      })();

    const cityList = locationsByCityKey.get(cityKey);
    if (cityList) {
      cityList.push(location);
    } else {
      locationsByCityKey.set(cityKey, [location]);
    }

    if (info.regionId) {
      const regionList = locationsByRegionId.get(info.regionId);
      if (regionList) {
        regionList.push(location);
      } else {
        locationsByRegionId.set(info.regionId, [location]);
      }
    }
  });

  // Sort locations within each map
  locationsByCityKey.forEach((locationList) => locationList.sort((a, b) => a.name.localeCompare(b.name)));
  locationsByRegionId.forEach((locationList) => locationList.sort((a, b) => a.name.localeCompare(b.name)));

  return {
    locationsByCityKey,
    locationsByRegionId,
    allLocations: locations,
  };
}

function inferTravelMode(
  location: Location | undefined,
  previousLocation: Location | undefined,
): ItineraryTravelMode {
  if (previousLocation?.preferredTransitModes?.length) {
    const firstMode = previousLocation.preferredTransitModes[0];
    if (firstMode) {
      return firstMode;
    }
  }
  if (location?.preferredTransitModes?.length) {
    const firstMode = location.preferredTransitModes[0];
    if (firstMode) {
      return firstMode;
    }
  }
  return "walk";
}
void inferTravelMode; // Intentionally unused - kept for future use

/**
 * Options for generating an itinerary
 */
export type GenerateItineraryOptions = {
  /**
   * Optional locations array for testing or when locations are pre-fetched.
   * When provided, skips database fetch.
   */
  locations?: Location[];
};

export async function generateItinerary(
  data: TripBuilderData,
  options?: GenerateItineraryOptions,
): Promise<Itinerary> {
  const totalDays =
    typeof data.duration === "number" && data.duration > 0 ? data.duration : DEFAULT_TOTAL_DAYS;

  // Use provided locations or fetch from database
  let allLocations: Location[];
  if (options?.locations && options.locations.length > 0) {
    allLocations = options.locations;
  } else {
    // Fetch locations filtered by selected cities (after ward consolidation)
    allLocations = await fetchAllLocations(data.cities);
  }
  const { locationsByCityKey, locationsByRegionId } = buildLocationMaps(allLocations);

  const citySequence = resolveCitySequence(data, locationsByCityKey, allLocations);
  const expandedCitySequence = expandCitySequenceForDays(citySequence, totalDays);
  const interestSequence = resolveInterestSequence(data);
  const usedLocations = new Set<string>();
  const usedLocationNames = new Set<string>(); // Track names to prevent same-name duplicates
  const pace = data.style ?? "balanced";
  const travelTime = getTravelTime(pace);

  // Fetch weather forecasts for all cities and dates
  const weatherContext: TripWeatherContext = {
    forecasts: new Map(),
    cityForecasts: new Map(),
  };

  if (data.dates.start && data.dates.end) {
    // Get unique cities from the expanded sequence
    const uniqueCities = new Set<CityId>();
    for (const cityInfo of expandedCitySequence) {
      const cityId = cityInfo.key as CityId;
      if (cityId && ["kyoto", "osaka", "nara", "tokyo", "yokohama"].includes(cityId)) {
        uniqueCities.add(cityId);
      }
    }

    // Fetch weather for each city
    for (const cityId of uniqueCities) {
      try {
        const forecasts = await fetchWeatherForecast(cityId, data.dates.start, data.dates.end);
        weatherContext.cityForecasts.set(cityId, forecasts);
        // Merge into overall forecasts map (later dates override earlier ones)
        for (const [date, forecast] of forecasts.entries()) {
          weatherContext.forecasts.set(date, forecast);
        }
      } catch (error) {
        // Weather fetch failed, continue without weather data
        logger.warn(`Failed to fetch weather for ${cityId}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const days: Itinerary["days"] = [];

  // Track consecutive days in each city for day trip suggestions
  const cityDayCounter = new Map<string, number>();
  let lastCityKey = "";

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    let cityInfo = expandedCitySequence[dayIndex];
    if (!cityInfo) {
      throw new Error(`City info not found for day ${dayIndex}`);
    }

    // Update city day counter for day trip logic
    if (cityInfo.key === lastCityKey) {
      cityDayCounter.set(cityInfo.key, (cityDayCounter.get(cityInfo.key) ?? 0) + 1);
    } else {
      cityDayCounter.set(cityInfo.key, 1);
      lastCityKey = cityInfo.key;
    }
    const daysInCurrentCity = cityDayCounter.get(cityInfo.key) ?? 1;

    // Check if we should suggest a day trip (for extended single-city stays)
    let activeDayTrip: DayTripConfig | undefined;
    const baseCityLocations = locationsByCityKey.get(cityInfo.key) ?? [];
    const unusedInBaseCity = baseCityLocations.filter((loc) => !usedLocations.has(loc.id));

    // Only suggest day trip if user selected a single city and we're running low on locations
    const isSingleCityTrip = data.cities && data.cities.length === 1;
    if (isSingleCityTrip) {
      activeDayTrip = shouldSuggestDayTrip(
        cityInfo.key,
        daysInCurrentCity,
        unusedInBaseCity.length,
        3, // Target activities per day
      );

      // If day trip suggested and the target city has locations, switch to day trip city
      if (activeDayTrip) {
        const dayTripLocations = locationsByCityKey.get(activeDayTrip.cityId) ?? [];
        const unusedInDayTripCity = dayTripLocations.filter((loc) => !usedLocations.has(loc.id));

        if (unusedInDayTripCity.length >= 3) {
          // Switch to day trip city for this day
          const dayTripCityInfo = CITY_INFO_BY_KEY.get(activeDayTrip.cityId);
          if (dayTripCityInfo) {
            cityInfo = dayTripCityInfo;
            logger.info(`Day ${dayIndex + 1}: Scheduling day trip from ${lastCityKey} to ${activeDayTrip.cityId}`, {
              daysInBaseCity: daysInCurrentCity,
              unusedInBaseCity: unusedInBaseCity.length,
              unusedInDayTripCity: unusedInDayTripCity.length,
            });
          }
        } else {
          // Not enough locations in day trip city, skip
          activeDayTrip = undefined;
        }
      }
    }

    // Get available locations for this city
    const cityLocations = locationsByCityKey.get(cityInfo.key) ?? [];
    const regionLocations = cityInfo.regionId
      ? locationsByRegionId.get(cityInfo.regionId) ?? []
      : [];
    // Use city locations if available, otherwise fall back to region locations
    // Apply comprehensive geographic validation to prevent cross-region recommendations
    const rawAvailableLocations = cityLocations.length > 0 ? cityLocations : regionLocations;

    // Track names seen in this day's available locations to deduplicate database entries
    // (e.g., "Tottori Sand Dunes" may have 7 entries with different IDs but same name)
    const seenNamesInDay = new Set<string>();

    const availableLocations = rawAvailableLocations.filter((loc) => {
      // 1. Pre-filter by usedLocations (ID) to prevent duplicates across days
      if (usedLocations.has(loc.id)) return false;

      // 2. Pre-filter by usedLocationNames (name) to prevent same-name duplicates across days
      const normalizedName = loc.name.toLowerCase().trim();
      if (usedLocationNames.has(normalizedName)) return false;

      // 3. Deduplicate within this day's available locations (handles DB duplicates)
      // This ensures only ONE "Tottori Sand Dunes" entry makes it into availableLocations
      if (seenNamesInDay.has(normalizedName)) return false;
      seenNamesInDay.add(normalizedName);

      // 4. Basic city name matching
      const locationCityKey = normalizeKey(loc.city);
      if (locationCityKey !== cityInfo.key) {
        return false;
      }
      // 5. Geographic validation: ensure location is actually in the correct region
      // This catches data corruption where city="Osaka" but coordinates are in Okinawa
      return isLocationValidForCity(loc, cityInfo.key, cityInfo.regionId);
    });

    const dayActivities: Itinerary["days"][number]["activities"] = [];
    const dayCityUsage = new Map<string, number>();

    // Track time used in each slot
    const timeSlotUsage = new Map<typeof TIME_OF_DAY_SEQUENCE[number], number>();
    TIME_OF_DAY_SEQUENCE.forEach((slot) => timeSlotUsage.set(slot, 0));

    // Track interest cycling across the entire day (not per time slot)
    let interestIndex = 0;

    // Track categories and neighborhoods for diversity, and last location for distance
    const dayCategories: string[] = [];
    const dayNeighborhoods: string[] = [];
    let lastLocation: Location | undefined;

    // Track if we've exhausted all available locations for this day
    let locationsExhausted = false;
    let exhaustionAttempts = 0;
    const maxExhaustionAttempts = 3; // Try 3 different interests before giving up

    // Calculate day trip travel overhead (reduces available time in morning and evening slots)
    const dayTripOverhead = activeDayTrip ? getDayTripTravelOverhead(activeDayTrip) : 0;
    void dayTripOverhead; // Used via activeDayTrip.travelMinutes in slot adjustments

    // Fill each time slot intelligently
    for (const timeSlot of TIME_OF_DAY_SEQUENCE) {
      let availableMinutes = getAvailableTimeForSlot(timeSlot, pace);

      // Adjust for day trip travel time
      if (activeDayTrip) {
        if (timeSlot === "morning") {
          // Deduct outbound travel from morning
          availableMinutes = Math.max(60, availableMinutes - activeDayTrip.travelMinutes);
        } else if (timeSlot === "evening") {
          // Deduct return travel from evening
          availableMinutes = Math.max(60, availableMinutes - activeDayTrip.travelMinutes);
        }
      }

      let remainingTime = availableMinutes;
      let activityIndex = 0;

      // Ensure at least one activity per time slot
      while (remainingTime > 0 && activityIndex < 10) {
        // Cycle through interests
        const interest = interestSequence[interestIndex % interestSequence.length];
        if (!interest) {
          break;
        }

        // Get weather forecast for this day and city
        const dayDate = data.dates.start
          ? (() => {
              const startDate = new Date(data.dates.start);
              startDate.setDate(startDate.getDate() + dayIndex);
              return startDate.toISOString().split("T")[0];
            })()
          : undefined;
        const dayCityId = cityInfo.key as CityId | undefined;
        const dayWeatherForecast: WeatherForecast | undefined = dayDate && dayCityId
          ? weatherContext.cityForecasts.get(dayCityId)?.get(dayDate ?? "")
          : undefined;

        // Pick a location that fits the available time
        const locationResult = pickLocationForTimeSlot(
          availableLocations,
          interest,
          usedLocations,
          remainingTime,
          activityIndex === 0 ? 0 : travelTime, // No travel time for first activity in slot
          lastLocation?.coordinates, // Pass current location for distance calculation
          dayCategories, // Pass recent categories for diversity
          pace, // Pass travel style
          interestSequence, // Pass all interests for better matching
          data.budget, // Pass budget information
          data.accessibility?.mobility ? {
            wheelchairAccessible: true,
            elevatorRequired: false, // Can be enhanced based on specific needs
          } : undefined, // Pass accessibility requirements
          dayWeatherForecast, // Pass weather forecast
          data.weatherPreferences, // Pass weather preferences
          timeSlot, // Pass time slot for time optimization
          dayDate, // Pass date for weekday calculation
          data.group, // Pass group information
          dayNeighborhoods, // Pass recent neighborhoods for geographic diversity
          usedLocationNames, // Pass used names to prevent same-name duplicates
        );
        
        const location = locationResult && "_scoringReasoning" in locationResult 
          ? (locationResult as Location & { _scoringReasoning?: string[]; _scoreBreakdown?: import("./scoring/locationScoring").ScoreBreakdown })
          : locationResult;
        const scoringData = location && "_scoringReasoning" in location ? {
          reasoning: location._scoringReasoning,
          breakdown: location._scoreBreakdown,
        } : null;

        if (!location) {
          // If no location fits, check if we've exhausted available locations
          exhaustionAttempts++;
          interestIndex++;

          if (exhaustionAttempts >= maxExhaustionAttempts) {
            // All available locations exhausted - stop adding activities to this slot
            locationsExhausted = true;
            logger.warn(`Day ${dayIndex + 1}: Locations exhausted for ${cityInfo.key}`, {
              timeSlot,
              usedLocationsCount: usedLocations.size,
              availableLocationsCount: availableLocations.length,
              activityIndex,
            });
            break;
          }

          if (interestIndex >= interestSequence.length * 2) {
            // Prevent infinite loop
            break;
          }
          continue;
        }

        // SAFEGUARD: Double-check location isn't already used (should never happen,
        // but prevents duplicates if there's a bug in pickLocationForTimeSlot)
        if (usedLocations.has(location.id)) {
          logger.warn(`Duplicate location ID detected: "${location.name}" (${location.id}) - skipping`);
          interestIndex++;
          continue;
        }

        // Also check for same-name duplicates (different IDs but same restaurant/place name)
        // This prevents recommending multiple branches of the same establishment
        const normalizedName = location.name.toLowerCase().trim();
        if (usedLocationNames.has(normalizedName)) {
          logger.warn(`Duplicate location name detected: "${location.name}" - skipping (different ID but same name)`);
          interestIndex++;
          continue;
        }

        // Reset exhaustion counter on successful selection
        exhaustionAttempts = 0;

        const locationDuration = getLocationDurationMinutes(location);
        const timeNeeded = locationDuration + (activityIndex === 0 ? 0 : travelTime);

        // Check if location fits (with some flexibility)
        if (timeNeeded <= remainingTime * 1.1 || activityIndex === 0) {
          // First activity in slot must fit, others can be slightly over
          if (timeNeeded <= remainingTime * 1.1) {
            const locationKey = normalizeKey(location.city);
            dayCityUsage.set(locationKey, (dayCityUsage.get(locationKey) ?? 0) + 1);
            // Build recommendation reason from scoring data
            const recommendationReason = scoringData?.reasoning && scoringData.reasoning.length > 0 ? {
              primaryReason: scoringData.reasoning[0] ?? "Selected based on your interests and preferences",
              factors: scoringData.breakdown ? [
                { factor: "Interest Match", score: scoringData.breakdown.interestMatch, reasoning: scoringData.reasoning[0] ?? "" },
                { factor: "Rating Quality", score: scoringData.breakdown.ratingQuality, reasoning: scoringData.reasoning[1] ?? "" },
                { factor: "Logistical Fit", score: scoringData.breakdown.logisticalFit, reasoning: scoringData.reasoning[2] ?? "" },
                { factor: "Budget Fit", score: scoringData.breakdown.budgetFit, reasoning: scoringData.reasoning[3] ?? "" },
                { factor: "Accessibility", score: scoringData.breakdown.accessibilityFit, reasoning: scoringData.reasoning[4] ?? "" },
                { factor: "Diversity", score: scoringData.breakdown.diversityBonus, reasoning: scoringData.reasoning[5] ?? "" },
              ].filter(f => f.reasoning) : undefined,
            } : undefined;

            dayActivities.push({
              kind: "place",
              id: `${location.id}-${dayIndex + 1}-${timeSlot}-${activityIndex + 1}`,
              title: location.name,
              timeOfDay: timeSlot,
              durationMin: locationDuration,
              locationId: location.id,
              coordinates: location.coordinates,
              neighborhood: location.city,
              tags: buildTags(interest, location.category),
              recommendationReason,
            });
            usedLocations.add(location.id);
            usedLocationNames.add(normalizedName);
            remainingTime -= timeNeeded;
            timeSlotUsage.set(timeSlot, (timeSlotUsage.get(timeSlot) ?? 0) + timeNeeded);
            
            // Track category, neighborhood, and location for diversity and distance
            if (location.category) {
              dayCategories.push(location.category);
            }
            // Track neighborhood for geographic diversity (fall back to city if no neighborhood)
            const locationNeighborhood = location.neighborhood ?? location.city;
            if (locationNeighborhood) {
              dayNeighborhoods.push(locationNeighborhood);
            }
            lastLocation = location;
            
            activityIndex++;
            interestIndex++;
          } else {
            // Location doesn't fit, try next interest
            interestIndex++;
            if (interestIndex >= interestSequence.length * 2) {
              break;
            }
          }
        } else {
          // Location doesn't fit, try next interest
          interestIndex++;
          if (interestIndex >= interestSequence.length * 2) {
            break;
          }
        }

        // Stop if we've used most of the available time
        if (remainingTime < availableMinutes * 0.2 && activityIndex > 0) {
          break;
        }
      }

      // If locations exhausted, don't continue to more time slots
      if (locationsExhausted) {
        break;
      }
    }

    const previousDay = dayIndex > 0 ? days[dayIndex - 1] : undefined;
    const previousLocation =
      previousDay && previousDay.activities.length > 0
        ? allLocations.find((loc) => {
            const lastActivity = previousDay.activities[previousDay.activities.length - 1];
            return lastActivity && loc.name === lastActivity.title;
          })
        : undefined;
    void previousLocation; // Intentionally unused - kept for future use

    // Determine city ID for this day
    const dayCityId = cityInfo.key as CityId | undefined;

    // Generate a stable ID for this day
    // Use a combination of day index and random string for uniqueness
    const randomSuffix = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    const dayId = `day-${dayIndex + 1}-${randomSuffix}`;
    
    // Build day label - include day trip indicator if applicable
    let dateLabel = buildDayTitle(dayIndex, cityInfo.key);
    if (activeDayTrip) {
      const baseCityLabel = CITY_INFO_BY_KEY.get(lastCityKey)?.label ?? capitalize(lastCityKey);
      dateLabel = `Day ${dayIndex + 1} (Day Trip: ${baseCityLabel} → ${cityInfo.label})`;
    }

    days.push({
      id: dayId,
      dateLabel,
      cityId: dayCityId,
      activities: dayActivities,
      // Add metadata about day trip if applicable
      ...(activeDayTrip && {
        isDayTrip: true,
        baseCityId: lastCityKey as CityId,
        dayTripTravelMinutes: activeDayTrip.travelMinutes,
      }),
    });
  }

  return { days };
}

/**
 * Expand city sequence to fill the required number of days.
 * Groups cities by region and distributes days proportionally within each region
 * before moving to the next region, avoiding back-and-forth travel.
 * Preserves the optimized region order from the input sequence.
 */
function expandCitySequenceForDays(citySequence: CityInfo[], totalDays: number): CityInfo[] {
  if (citySequence.length === 0 || totalDays === 0) {
    return citySequence;
  }

  // If we have exactly the right number of cities, return as-is
  if (citySequence.length === totalDays) {
    return citySequence;
  }

  const expanded: CityInfo[] = [];
  
  // Group cities by region while preserving order
  const regionGroups: Array<{ regionId: RegionId | null; cities: CityInfo[] }> = [];
  let currentRegion: RegionId | null = null;
  let currentGroup: CityInfo[] = [];

  for (const cityInfo of citySequence) {
    const regionId = cityInfo.regionId ?? null;
    
    if (regionId !== currentRegion) {
      // Start a new region group
      if (currentGroup.length > 0) {
        regionGroups.push({ regionId: currentRegion, cities: currentGroup });
      }
      currentRegion = regionId;
      currentGroup = [cityInfo];
    } else {
      // Add to current region group
      currentGroup.push(cityInfo);
    }
  }
  
  // Add the last group
  if (currentGroup.length > 0) {
    regionGroups.push({ regionId: currentRegion, cities: currentGroup });
  }

  // Calculate proportional distribution
  const totalCities = citySequence.length;
  const daysPerCity = totalDays / totalCities;

  // Expand each region group proportionally
  for (const group of regionGroups) {
    const regionCityCount = group.cities.length;
    const regionDays = Math.max(1, Math.round(regionCityCount * daysPerCity));
    
    // Distribute days within this region, cycling through cities
    for (let i = 0; i < regionDays && expanded.length < totalDays; i++) {
      const cityIndex = i % regionCityCount;
      expanded.push(group.cities[cityIndex]!);
    }
  }

  // If we still need more days (due to rounding), fill from the end of the sequence
  let previousLength = 0;
  while (expanded.length < totalDays && expanded.length > previousLength) {
    previousLength = expanded.length;
    const remainingDays = totalDays - expanded.length;
    const startIndex = Math.max(0, citySequence.length - remainingDays);
    for (let i = startIndex; i < citySequence.length && expanded.length < totalDays; i++) {
      expanded.push(citySequence[i]!);
    }
  }
  
  // Final fallback: if still not enough, cycle through the sequence
  let cycleIndex = 0;
  while (expanded.length < totalDays) {
    expanded.push(citySequence[cycleIndex % citySequence.length]!);
    cycleIndex++;
  }

  // Trim to exact number of days
  return expanded.slice(0, totalDays);
}

function resolveCitySequence(
  data: TripBuilderData,
  locationsByCityKey: Map<string, Location[]>,
  allLocations: Location[],
): CityInfo[] {
  const sequence: CityInfo[] = [];
  const seen = new Set<string>();

  function addCityByKey(cityKey: string | undefined): void {
    if (!cityKey || seen.has(cityKey)) {
      return;
    }
    const info = CITY_INFO_BY_KEY.get(cityKey);
    if (!info) {
      return;
    }
    if (!locationsByCityKey.has(cityKey)) {
      return;
    }
    sequence.push(info);
    seen.add(cityKey);
  }

  // Collect user-selected cities
  const userCities: CityId[] = [];
  if (data.cities && data.cities.length > 0) {
    userCities.push(...data.cities);
  }

  if (data.regions && data.regions.length > 0) {
    data.regions.forEach((regionId) => {
      const region = REGIONS.find((r) => r.id === regionId);
      region?.cities.forEach((city) => {
        if (!userCities.includes(city.id)) {
          userCities.push(city.id);
        }
      });
    });
  }

  // If no user selections, use defaults
  const citiesToOptimize = userCities.length > 0 ? userCities : [...DEFAULT_CITY_ROTATION];

  // Always optimize city sequence by region (with or without entry point)
  // This groups cities geographically to minimize travel time
  if (citiesToOptimize.length > 0) {
    const optimizedSequence = optimizeCitySequence(data.entryPoint, citiesToOptimize);
    optimizedSequence.forEach((cityId) => addCityByKey(cityId));
  }

  // Fallback if still empty
  if (sequence.length === 0) {
    DEFAULT_CITY_ROTATION.forEach((cityId) => addCityByKey(cityId));
  }

  if (sequence.length === 0) {
    const firstLocation = allLocations[0];
    if (firstLocation) {
      const firstCityKey = normalizeKey(firstLocation.city);
      addCityByKey(firstCityKey);
    }
  }

  if (sequence.length === 0) {
    sequence.push({ key: "japan", label: "Japan" });
  }

  return sequence;
}

/**
 * Optimize city sequence based on entry point and geographic grouping.
 * Groups cities by region first, then optimizes order within regions and between regions
 * to minimize travel time - similar to how a human travel agent would plan.
 */
function optimizeCitySequence(
  entryPoint: TripBuilderData["entryPoint"],
  cities: CityId[],
): CityId[] {
  if (cities.length === 0) {
    return cities;
  }

  // Group cities by region
  const citiesByRegion = new Map<RegionId, CityId[]>();
  for (const city of cities) {
    const regionId = getRegionForCity(city);
    if (regionId) {
      const regionCities = citiesByRegion.get(regionId) ?? [];
      regionCities.push(city);
      citiesByRegion.set(regionId, regionCities);
    }
  }

  // If no regions found or only one region, fall back to simple optimization
  if (citiesByRegion.size <= 1) {
    return optimizeCitiesWithinRegion(cities, entryPoint);
  }

  // Optimize order within each region
  const optimizedRegions = new Map<RegionId, CityId[]>();
  for (const [regionId, regionCities] of citiesByRegion.entries()) {
    optimizedRegions.set(regionId, optimizeCitiesWithinRegion(regionCities, entryPoint));
  }

  // Determine optimal region order based on entry point and travel time
  const regionOrder = optimizeRegionOrder(
    Array.from(optimizedRegions.keys()),
    entryPoint,
    optimizedRegions,
  );

  // Concatenate cities in optimal region order
  const result: CityId[] = [];
  for (const regionId of regionOrder) {
    const regionCities = optimizedRegions.get(regionId);
    if (regionCities) {
      result.push(...regionCities);
    }
  }

  return result;
}

/**
 * Optimize city order within a single region using travel time.
 * Uses greedy nearest-neighbor approach starting from the entry point or first city.
 */
function optimizeCitiesWithinRegion(
  cities: CityId[],
  entryPoint: TripBuilderData["entryPoint"],
): CityId[] {
  if (cities.length <= 1) {
    return cities;
  }

  // Find starting city (nearest to entry point if available, otherwise first city)
  let startCity: CityId | undefined;
  if (entryPoint) {
    const nearestCity = getNearestCityToEntryPoint(entryPoint);
    if (nearestCity && cities.includes(nearestCity)) {
      startCity = nearestCity;
    }
  }

  if (!startCity) {
    startCity = cities[0];
  }
  
  if (!startCity) {
    return cities; // Fallback if no cities available
  }

  const optimized: CityId[] = [startCity];
  const unvisited = new Set(cities.filter((c) => c !== startCity));
  let currentCity: CityId = startCity;

  // Greedy nearest-neighbor within region
  while (unvisited.size > 0) {
    let nearest: CityId | undefined;
    let minTime = Infinity;

    for (const city of unvisited) {
      const time = travelMinutes(currentCity, city);
      if (time !== undefined && time < minTime) {
        minTime = time;
        nearest = city;
      }
    }

    if (nearest) {
      optimized.push(nearest);
      unvisited.delete(nearest);
      currentCity = nearest;
    } else {
      // No travel time data, add remaining cities
      optimized.push(...Array.from(unvisited));
      break;
    }
  }

  return optimized;
}

/**
 * Optimize the order of regions based on entry point proximity and inter-region travel time.
 * Returns regions in optimal order (e.g., Kansai first, then Kanto, or vice versa).
 */
function optimizeRegionOrder(
  regions: RegionId[],
  entryPoint: TripBuilderData["entryPoint"],
  optimizedRegions: Map<RegionId, CityId[]>,
): RegionId[] {
  if (regions.length <= 1) {
    return regions;
  }

  // Find which region contains the nearest city to entry point
  let startRegion: RegionId | undefined;
  if (entryPoint) {
    const nearestCity = getNearestCityToEntryPoint(entryPoint);
    if (nearestCity) {
      const nearestRegion = getRegionForCity(nearestCity);
      if (nearestRegion && regions.includes(nearestRegion)) {
        startRegion = nearestRegion;
      }
    }
  }

  // If no entry point or nearest region not in selection, use first region
  if (!startRegion) {
    startRegion = regions[0];
  }

  if (!startRegion) {
    return regions; // Fallback if no start region
  }
  
  const optimized: RegionId[] = [startRegion];
  const unvisited = new Set(regions.filter((r) => r !== startRegion));

  // Optimize region order using travel time between regions
  // Use the first city of each region as a representative for inter-region travel
  let currentRegion = startRegion;

  while (unvisited.size > 0) {
    let nearestRegion: RegionId | undefined;
    let minTime = Infinity;

    const currentRegionCities = optimizedRegions.get(currentRegion);
    const currentRepresentative = currentRegionCities?.[currentRegionCities.length - 1]; // Use last city of current region

    for (const region of unvisited) {
      const regionCities = optimizedRegions.get(region);
      const regionRepresentative = regionCities?.[0]; // Use first city of next region

      if (currentRepresentative && regionRepresentative) {
        const time = travelMinutes(currentRepresentative, regionRepresentative);
        if (time !== undefined && time < minTime) {
          minTime = time;
          nearestRegion = region;
        }
      }
    }

    if (nearestRegion) {
      optimized.push(nearestRegion);
      unvisited.delete(nearestRegion);
      currentRegion = nearestRegion;
    } else {
      // No travel time data, add remaining regions
      optimized.push(...Array.from(unvisited));
      break;
    }
  }

  return optimized;
}

function resolveInterestSequence(data: TripBuilderData): InterestId[] {
  if (data.interests && data.interests.length > 0) {
    return data.interests;
  }
  return [...DEFAULT_INTEREST_ROTATION];
}

function pickLocation(
  cityInfo: CityInfo,
  interest: InterestId,
  usedLocations: Set<string>,
  locationsByCityKey: Map<string, Location[]>,
  locationsByRegionId: Map<RegionId, Location[]>,
  allLocations: Location[],
): Location | undefined {
  const cityLocations = locationsByCityKey.get(cityInfo.key);
  if (!cityLocations || cityLocations.length === 0) {
    if (cityInfo.regionId) {
      const regionLocations = locationsByRegionId.get(cityInfo.regionId);
      if (regionLocations && regionLocations.length > 0) {
        return pickFromList(regionLocations, interest, usedLocations);
      }
    }
    return pickFromList(allLocations, interest, usedLocations);
  }

  return pickFromList(cityLocations, interest, usedLocations);
}
void pickLocation; // Intentionally unused - kept for future use

function pickFromList(
  list: Location[],
  interest: InterestId,
  usedLocations: Set<string>,
): Location | undefined {
  const categoryMap: Record<InterestId, LocationCategory[]> = {
    culture: ["shrine", "temple", "landmark", "historic"],
    food: ["restaurant", "market"],
    nature: ["park", "garden"],
    nightlife: ["bar", "entertainment"],
    shopping: ["shopping", "market"],
    photography: ["landmark", "viewpoint", "park"],
    wellness: ["park", "garden"],
    history: ["shrine", "temple", "historic", "museum"],
  };

  const preferredCategories = categoryMap[interest] ?? [];
  const unused = list.filter((loc) => !usedLocations.has(loc.id));

  // CRITICAL FIX: Return undefined when all locations are exhausted
  // instead of returning a duplicate from the full list
  if (unused.length === 0) {
    return undefined;
  }

  const preferred = unused.filter((loc) => preferredCategories.includes(loc.category));
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)];
  }

  return unused[Math.floor(Math.random() * unused.length)];
}
void pickFromList; // Intentionally unused - kept for future use

/**
 * Pick a location that fits within the available time budget.
 * Uses intelligent scoring system to select the best location.
 */
function pickLocationForTimeSlot(
  list: Location[],
  interest: InterestId,
  usedLocations: Set<string>,
  availableMinutes: number,
  travelTime: number,
  currentLocation?: { lat: number; lng: number },
  recentCategories: string[] = [],
  travelStyle: TripBuilderData["style"] = "balanced",
  interests: InterestId[] = [],
  budget?: {
    level?: "budget" | "moderate" | "luxury";
    total?: number;
    perDay?: number;
  },
  accessibility?: {
    wheelchairAccessible?: boolean;
    elevatorRequired?: boolean;
  },
  weatherForecast?: WeatherForecast,
  weatherPreferences?: {
    preferIndoorOnRain?: boolean;
    minTemperature?: number;
    maxTemperature?: number;
  },
  timeSlot?: "morning" | "afternoon" | "evening",
  date?: string,
  group?: {
    size?: number;
    type?: "solo" | "couple" | "family" | "friends" | "business";
    childrenAges?: number[];
  },
  recentNeighborhoods: string[] = [],
  usedLocationNames: Set<string> = new Set(),
): (Location & { _scoringReasoning?: string[]; _scoreBreakdown?: import("./scoring/locationScoring").ScoreBreakdown; _isReturnVisit?: boolean }) | undefined {
  // Filter by both ID and name to prevent duplicates (including same-name different branches)
  const unused = list.filter((loc) => {
    if (usedLocations.has(loc.id)) return false;
    const normalizedName = loc.name.toLowerCase().trim();
    if (usedLocationNames.has(normalizedName)) return false;
    return true;
  });

  // CRITICAL FIX: Return undefined when all locations are exhausted
  // The caller should handle this by suggesting day trips or reducing activities
  if (unused.length === 0) {
    return undefined;
  }

  // Pre-filter by hard constraints (opening hours)
  // Only filter if we have time slot and date information
  let candidates = unused;
  if (timeSlot && date) {
    candidates = unused.filter((loc) => {
      const openingHoursCheck = checkOpeningHoursFit(loc, timeSlot, date);
      return openingHoursCheck.fits;
    });
    
    // If all candidates filtered out, fall back to unused (better than no location)
    if (candidates.length === 0) {
      logger.warn("All locations filtered out by opening hours, using unfiltered list", {
        timeSlot,
        date,
        unusedCount: unused.length,
      });
      candidates = unused;
    }
  }

  // Score all candidates
  const criteria: LocationScoringCriteria = {
    interests: interests.length > 0 ? interests : [interest],
    travelStyle: travelStyle ?? "balanced",
    budgetLevel: budget?.level,
    budgetTotal: budget?.total,
    budgetPerDay: budget?.perDay,
    accessibility,
    currentLocation,
    availableMinutes: availableMinutes - travelTime, // Subtract travel time from available
    recentCategories,
    recentNeighborhoods,
    weatherForecast,
    weatherPreferences,
    timeSlot,
    date,
    group,
  };

  const scored = candidates
    .map((loc) => scoreLocation(loc, criteria))
    // Filter out locations with very negative scores (e.g., -100 for >50km distance)
    // These are effectively "invalid" for this query
    .filter((locScore) => locScore.score >= -50);

  // Apply diversity filter
  const diversityContext: DiversityContext = {
    recentCategories,
    visitedLocationIds: usedLocations,
    currentDay: 0, // Not currently used in diversity scoring, but kept for future enhancements
    energyLevel: 100,
  };

  const filtered = applyDiversityFilter(scored, diversityContext);

  // Sort by score, descending
  filtered.sort((a, b) => b.score - a.score);

  // Pick from top 5 with some randomness to avoid identical itineraries
  const topCandidates = filtered.slice(0, Math.min(5, filtered.length));
  if (topCandidates.length === 0) {
    // Fallback if all filtered out - still respect usedLocations AND usedLocationNames
    const fallbackCandidates = candidates.filter((loc) => {
      if (usedLocations.has(loc.id)) return false;
      const normalizedName = loc.name.toLowerCase().trim();
      if (usedLocationNames.has(normalizedName)) return false;
      return true;
    });
    if (fallbackCandidates.length === 0) {
      return undefined; // No valid locations left
    }
    const fallback = fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
    return fallback ? { ...fallback } : undefined;
  }

  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  
  // Return location with reasoning metadata attached
  if (selected?.location) {
    return {
      ...selected.location,
      _scoringReasoning: selected.reasoning,
      _scoreBreakdown: selected.breakdown,
    };
  }
  
  return undefined;
}

function buildTags(interest: InterestId, category: LocationCategory): string[] {
  const tags: string[] = [];
  const interestMap: Record<InterestId, string> = {
    culture: "cultural",
    food: "dining",
    nature: "nature",
    nightlife: "nightlife",
    shopping: "shopping",
    photography: "photo spot",
    wellness: "relaxation",
    history: "historical",
  };

  const categoryMap: Record<LocationCategory, string> = {
    shrine: "shrine",
    temple: "temple",
    landmark: "landmark",
    historic: "historic site",
    restaurant: "restaurant",
    market: "market",
    park: "park",
    garden: "garden",
    shopping: "shopping",
    bar: "nightlife",
    entertainment: "entertainment",
    museum: "museum",
    viewpoint: "viewpoint",
  };

  const interestTag = interestMap[interest];
  if (interestTag) {
    tags.push(interestTag);
  }

  const categoryTag = categoryMap[category];
  if (categoryTag && categoryTag !== interestTag) {
    tags.push(categoryTag);
  }

  return tags;
}

function buildDayTitle(dayIndex: number, cityKey: string): string {
  const region = getRegionForCity(cityKey);
  if (region) {
    const cityInfo = CITY_INFO_BY_KEY.get(cityKey);
    const cityLabel = cityInfo?.label ?? capitalize(cityKey);
    return `Day ${dayIndex + 1} (${cityLabel})`;
  }

  // For unknown cities, try to find city name from REGIONS
  for (const regionData of REGIONS) {
    const city = regionData.cities.find((c) => c.id === cityKey);
    if (city) {
      return `Day ${dayIndex + 1} (${city.name})`;
    }
  }
  const info = CITY_INFO_BY_KEY.get(cityKey);
  const label = info?.label ?? capitalize(cityKey);
  return `Day ${dayIndex + 1} (${label})`;
}

function findAnyCityForRegion(
  regionId: RegionId,
  locationsByCityKey: Map<string, Location[]>,
  locationsByRegionId: Map<RegionId, Location[]>,
): string | undefined {
  const region = REGIONS.find((r) => r.id === regionId);
  if (region && region.cities.length > 0) {
    for (const city of region.cities) {
      const cityKey = normalizeKey(city.id);
      if (locationsByCityKey.has(cityKey)) {
        return cityKey;
      }
    }
  }
  const regionLocations = locationsByRegionId.get(regionId);
  if (regionLocations && regionLocations.length > 0) {
    const firstLocation = regionLocations[0];
    if (firstLocation) {
      return normalizeKey(firstLocation.city);
    }
  }
  return undefined;
}
void findAnyCityForRegion; // Intentionally unused - kept for future use

/**
 * Get the duration of a location in minutes.
 * Prefers recommendedVisit.typicalMinutes, falls back to parsing estimatedDuration string,
 * then category-based defaults.
 * 
 * Note: This is a synchronous function used during initial itinerary generation.
 * For more accurate durations with Google Places data, see determineVisitDuration
 * in itineraryPlanner.ts which runs during the planning phase.
 */
function getLocationDurationMinutes(location: Location): number {
  // 1. Prefer structured recommendation
  if (location.recommendedVisit?.typicalMinutes) {
    return location.recommendedVisit.typicalMinutes;
  }

  // 2. Parse estimatedDuration string (e.g., "1.5 hours", "2 hours", "0.5 hours")
  if (location.estimatedDuration) {
    const match = location.estimatedDuration.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)/i);
    if (match) {
      const hours = parseFloat(match[1] ?? "1");
      return Math.round(hours * 60);
    }
  }

  // 3. Use category-based default if available
  if (location.category) {
    const categoryDefault = getCategoryDefaultDuration(location.category);
    if (categoryDefault !== 90) {
      // Only use if it's different from the global default
      return categoryDefault;
    }
  }

  // 4. Default fallback: 90 minutes
  return 90;
}

/**
 * Calculate available time for a time slot based on travel pace.
 */
function getAvailableTimeForSlot(
  timeSlot: typeof TIME_OF_DAY_SEQUENCE[number],
  pace: TripBuilderData["style"],
): number {
  const baseCapacity = TIME_SLOT_CAPACITIES[timeSlot];
  const multiplier = pace ? PACE_MULTIPLIERS[pace] : PACE_MULTIPLIERS.balanced;
  return Math.floor(baseCapacity * multiplier);
}

/**
 * Get average travel time between locations based on pace.
 */
function getTravelTime(pace: TripBuilderData["style"]): number {
  return pace ? TRAVEL_TIME_BY_PACE[pace] : TRAVEL_TIME_BY_PACE.balanced;
}

function normalizeKey(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
