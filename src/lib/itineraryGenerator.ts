import { getRegionForCity, REGIONS } from "@/data/regions";
import { shouldSuggestDayTrip, getDayTripsFromCity, type DayTripConfig } from "@/data/dayTrips";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { CityId, InterestId, RegionId, TripBuilderData } from "@/types/trip";
import type { TripWeatherContext, WeatherForecast } from "@/types/weather";
import { getCategoryDefaultDuration } from "./durationExtractor";
import { fetchWeatherForecast } from "./weather/weatherService";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { fetchAllLocations } from "@/lib/locations/locationService";
import { normalizeKey } from "@/lib/utils/stringUtils";

// Import from extracted modules
import { isLocationValidForCity } from "@/lib/geo/validation";
import {
  clusterCityLocations,
  selectZoneForDay,
  getExpandedZoneLocationIds,
  type CityZoneMap,
} from "@/lib/geo/zoneClustering";
import {
  TIME_OF_DAY_SEQUENCE,
  getAvailableTimeForSlot,
  getTravelTime,
} from "@/lib/scheduling/timeSlots";
import {
  type CityInfo,
  CITY_INFO_BY_KEY,
  REGION_ID_BY_LABEL,
  expandCitySequenceForDays,
  resolveCitySequence,
} from "@/lib/routing/citySequence";
import { pickLocationForTimeSlot } from "@/lib/selection/locationPicker";
import { formatRecommendationReason } from "@/lib/scoring/reasonFormatter";

/**
 * Food-related location categories for meal detection.
 */
const FOOD_CATEGORIES = new Set(["restaurant", "cafe", "bar"]);

/**
 * Check if a location category indicates a food/dining establishment.
 */
function isFoodCategory(category: string): boolean {
  return FOOD_CATEGORIES.has(category.toLowerCase());
}

/**
 * Infer meal type from time of day.
 */
function inferMealTypeFromTimeSlot(
  timeSlot: "morning" | "afternoon" | "evening"
): "breakfast" | "lunch" | "dinner" {
  switch (timeSlot) {
    case "morning":
      return "breakfast";
    case "afternoon":
      return "lunch";
    case "evening":
      return "dinner";
  }
}

/**
 * Pick a time slot for a saved location based on its category.
 * Falls back to the least-used slot when the preferred slot is >80% capacity.
 */
function pickTimeSlotForSaved(
  category: string,
  timeSlotUsage: Map<string, number>,
): "morning" | "afternoon" | "evening" {
  const cat = category.toLowerCase();

  // Category → preferred time slot mapping
  const EVENING_CATS = new Set(["bar", "entertainment"]);
  const AFTERNOON_CATS = new Set(["museum", "shopping", "mall"]);
  const MORNING_CATS = new Set(["shrine", "temple", "park", "garden", "market", "nature", "viewpoint"]);

  let preferred: "morning" | "afternoon" | "evening" = "morning";
  if (EVENING_CATS.has(cat)) preferred = "evening";
  else if (AFTERNOON_CATS.has(cat)) preferred = "afternoon";
  else if (MORNING_CATS.has(cat)) preferred = "morning";

  // Check if preferred slot is over 80% capacity
  const capacities = { morning: 180, afternoon: 300, evening: 240 };
  const usage = timeSlotUsage.get(preferred) ?? 0;
  if (usage < capacities[preferred] * 0.8) return preferred;

  // Overflow to the least-used slot
  const slots: ("morning" | "afternoon" | "evening")[] = ["morning", "afternoon", "evening"];
  slots.sort((a, b) => (timeSlotUsage.get(a) ?? 0) - (timeSlotUsage.get(b) ?? 0));
  return slots[0]!;
}

const DEFAULT_TOTAL_DAYS = 5;
const DEFAULT_INTEREST_ROTATION: readonly InterestId[] = ["culture", "nature", "shopping"];

type LocationCategory = Location["category"];

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


/**
 * Options for generating an itinerary
 */
export type GenerateItineraryOptions = {
  /**
   * Optional locations array for testing or when locations are pre-fetched.
   * When provided, skips database fetch.
   */
  locations?: Location[];
  /**
   * Location IDs that the user has saved from the Places page.
   * These locations will be prioritized and included in the generated itinerary.
   */
  savedIds?: string[];
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
    allLocations = await fetchAllLocations({ cities: data.cities });

    // Expand fetch to include day trip target cities for small selections
    // (1-2 cities) where location exhaustion is likely on longer trips
    if (data.cities && data.cities.length <= 2) {
      const dayTripCityIds = new Set<string>();
      for (const cityId of data.cities) {
        const trips = getDayTripsFromCity(cityId);
        trips.forEach((t) => dayTripCityIds.add(t.cityId));
      }
      // Remove already-fetched cities
      data.cities.forEach((c) => dayTripCityIds.delete(c));
      if (dayTripCityIds.size > 0) {
        const dayTripLocations = await fetchAllLocations({
          cities: Array.from(dayTripCityIds),
        });
        allLocations = [...allLocations, ...dayTripLocations];
      }
    }
  }
  const { locationsByCityKey, locationsByRegionId } = buildLocationMaps(allLocations);

  // Build content location ID set for editorial scoring boost
  const contentLocationIds = data.contentContext?.locationIds?.length
    ? new Set(data.contentContext.locationIds)
    : undefined;

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
      if (cityId) {
        uniqueCities.add(cityId);
      }
    }

    // Fetch weather for all cities in parallel (was sequential — major bottleneck)
    const cityIds = Array.from(uniqueCities);
    const weatherResults = await Promise.allSettled(
      cityIds.map((cityId) => fetchWeatherForecast(cityId, data.dates.start!, data.dates.end!)),
    );
    for (let i = 0; i < cityIds.length; i++) {
      const result = weatherResults[i];
      if (!result || result.status === "rejected") {
        logger.warn(`Failed to fetch weather for ${cityIds[i]}`, {
          error: result ? getErrorMessage(result.reason) : "unknown",
        });
        continue;
      }
      const forecasts = result.value;
      weatherContext.cityForecasts.set(cityIds[i]!, forecasts);
      for (const [date, forecast] of forecasts.entries()) {
        weatherContext.forecasts.set(date, forecast);
      }
    }
  }

  // Pre-compute geographic zones for each city
  const cityZoneMaps = new Map<string, CityZoneMap>();
  for (const [cityKey, cityLocs] of locationsByCityKey) {
    const zoneMap = clusterCityLocations(cityLocs, cityKey);
    if (zoneMap) {
      cityZoneMaps.set(cityKey, zoneMap);
    }
  }
  const usedZonesByCity = new Map<string, Set<string>>();

  const days: Itinerary["days"] = [];

  // Build map of saved locations by city for prioritization
  const savedIdSet = new Set(options?.savedIds ?? []);
  const savedByCity = new Map<string, Location[]>();
  if (savedIdSet.size > 0) {
    for (const loc of allLocations) {
      if (savedIdSet.has(loc.id)) {
        const cityKey = normalizeKey(loc.city);
        const list = savedByCity.get(cityKey) ?? [];
        list.push(loc);
        savedByCity.set(cityKey, list);
      }
    }
    logger.info("Saved locations to include", {
      totalSaved: savedIdSet.size,
      foundInData: Array.from(savedByCity.entries()).map(([city, locs]) => ({
        city,
        count: locs.length,
        names: locs.map((l) => l.name),
      })),
    });
  }

  // Pre-count total days per city for zone rotation
  const totalDaysPerCity = new Map<string, number>();
  for (const ci of expandedCitySequence) {
    totalDaysPerCity.set(ci.key, (totalDaysPerCity.get(ci.key) ?? 0) + 1);
  }

  // Track consecutive days in each city for day trip suggestions
  const cityDayCounter = new Map<string, number>();
  let lastCityKey = "";

  // Day trip limits: scale with trip length, capped to stay supplementary
  // 5d→1, 7d→2, 10d→3, 14d→4
  const MAX_DAY_TRIPS = Math.min(4, Math.ceil(totalDays / 4));
  let dayTripCount = 0;

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
    // Exclude food categories from the count — the generator never schedules
    // them as activities, so they inflate the "remaining" count artificially.
    const unusedInBaseCity = baseCityLocations.filter(
      (loc) => !usedLocations.has(loc.id) && !isFoodCategory(loc.category),
    );

    // Suggest day trips for small city selections (1-2 cities) when running low on locations.
    // Capped at MAX_DAY_TRIPS to keep them supplementary — no spacing constraint since
    // the exhaustion trigger already gates when trips fire.
    const isSmallCitySelection = data.cities && data.cities.length <= 2;
    const canScheduleDayTrip = dayTripCount < MAX_DAY_TRIPS;

    if (isSmallCitySelection && canScheduleDayTrip) {
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
            dayTripCount++;
            logger.info(`Day ${dayIndex + 1}: Scheduling day trip from ${lastCityKey} to ${activeDayTrip.cityId}`, {
              daysInBaseCity: daysInCurrentCity,
              unusedInBaseCity: unusedInBaseCity.length,
              unusedInDayTripCity: unusedInDayTripCity.length,
              dayTripCount,
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
      if (!isLocationValidForCity(loc, cityInfo.key, cityInfo.regionId)) return false;

      // 6. Exclude food categories - meals are optional and added via smart prompts
      // This allows users to opt into meal recommendations rather than auto-filling them
      if (isFoodCategory(loc.category)) return false;

      return true;
    });

    // Zone clustering: select a walkable zone for this day and filter candidates
    const cityZoneMap = cityZoneMaps.get(cityInfo.key);
    let zoneFilteredLocations: Location[] | null = null;
    let selectedZoneId: string | null = null;
    let isZoneClustered = false;

    if (cityZoneMap) {
      if (!usedZonesByCity.has(cityInfo.key)) {
        usedZonesByCity.set(cityInfo.key, new Set());
      }
      const usedZones = usedZonesByCity.get(cityInfo.key)!;

      selectedZoneId = selectZoneForDay(
        cityZoneMap,
        daysInCurrentCity - 1,
        totalDaysPerCity.get(cityInfo.key) ?? 1,
        usedZones,
        interestSequence,
        savedIdSet.size > 0 ? savedIdSet : undefined,
      );

      if (selectedZoneId) {
        usedZones.add(selectedZoneId);
        const zoneLocIds = cityZoneMap.zones.get(selectedZoneId)?.locationIds;
        if (zoneLocIds && zoneLocIds.size >= 3) {
          zoneFilteredLocations = availableLocations.filter((loc) => zoneLocIds.has(loc.id));
          // Only apply zone filter if it yields enough candidates
          if (zoneFilteredLocations.length >= 3) {
            isZoneClustered = true;
            logger.info(`Day ${dayIndex + 1} (${cityInfo.key}): Zone ${selectedZoneId} selected — ${zoneFilteredLocations.length} candidates`);
          } else {
            zoneFilteredLocations = null;
          }
        }
      }
    }

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

    // Add saved locations for this city first (user explicitly saved these)
    const savedForCity = savedByCity.get(cityInfo.key) ?? [];
    for (const favLoc of savedForCity) {
      // Skip if already used
      if (usedLocations.has(favLoc.id)) continue;
      const normalizedName = favLoc.name.toLowerCase().trim();
      if (usedLocationNames.has(normalizedName)) continue;

      const locationDuration = getLocationDurationMinutes(favLoc);
      const isFood = isFoodCategory(favLoc.category);

      // Assign time slot based on category instead of hardcoding morning
      const timeSlot = pickTimeSlotForSaved(favLoc.category, timeSlotUsage);

      // Build activity for saved location
      const activity: Extract<ItineraryActivity, { kind: "place" }> = {
        kind: "place",
        id: `${favLoc.id}-${dayIndex + 1}-fav`,
        title: favLoc.name,
        timeOfDay: timeSlot,
        durationMin: locationDuration,
        locationId: favLoc.id,
        coordinates: favLoc.coordinates,
        neighborhood: favLoc.neighborhood ?? favLoc.city,
        tags: favLoc.category ? [favLoc.category, "saved"] : ["saved"],
        notes: "From your saved places",
        recommendationReason: { primaryReason: "From your saved places" },
        ...(favLoc.description && { description: favLoc.description }),
        ...(isFood && { mealType: inferMealTypeFromTimeSlot(timeSlot) }),
      };

      dayActivities.push(activity);
      usedLocations.add(favLoc.id);
      usedLocationNames.add(normalizedName);

      // Track for diversity
      if (favLoc.category) {
        dayCategories.push(favLoc.category);
      }
      const locNeighborhood = favLoc.neighborhood ?? favLoc.city;
      if (locNeighborhood) {
        dayNeighborhoods.push(locNeighborhood);
      }
      lastLocation = favLoc;

      // Update time slot usage
      timeSlotUsage.set(timeSlot, (timeSlotUsage.get(timeSlot) ?? 0) + locationDuration);

      logger.info(`Day ${dayIndex + 1}: Added saved location "${favLoc.name}"`);
    }

    // Track assigned meal types to prevent multiple lunches/dinners per day
    // Only one "full meal" per slot (breakfast, lunch, dinner). Additional food places become "snacks"
    const usedMealTypesForDay = new Set<"breakfast" | "lunch" | "dinner">();

    // Track if we've exhausted all available locations for this day
    let locationsExhausted = false;
    let exhaustionAttempts = 0;
    const maxExhaustionAttempts = 3; // Try 3 different interests before giving up

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

        // Pick a location — try zone-filtered first, then expand, then full city
        const pickArgs = [
          interest,
          usedLocations,
          remainingTime,
          activityIndex === 0 ? 0 : travelTime,
          lastLocation?.coordinates,
          dayCategories,
          pace,
          interestSequence,
          data.budget,
          data.accessibility?.mobility ? {
            wheelchairAccessible: true,
            elevatorRequired: false,
          } : undefined,
          dayWeatherForecast,
          data.weatherPreferences,
          timeSlot,
          dayDate,
          data.group,
          dayNeighborhoods,
          usedLocationNames,
          contentLocationIds,
        ] as const;

        let locationResult = isZoneClustered && zoneFilteredLocations
          ? pickLocationForTimeSlot(zoneFilteredLocations, ...pickArgs, true)
          : null;

        // Tier 2: Expand to neighboring zones
        if (!locationResult && isZoneClustered && selectedZoneId && cityZoneMap) {
          const expandedIds = getExpandedZoneLocationIds(cityZoneMap, selectedZoneId);
          const expandedLocs = availableLocations.filter((loc) => expandedIds.has(loc.id));
          if (expandedLocs.length >= 3) {
            locationResult = pickLocationForTimeSlot(expandedLocs, ...pickArgs, true);
          }
        }

        // Tier 3: Fall back to full city pool (original behavior)
        if (!locationResult) {
          locationResult = pickLocationForTimeSlot(availableLocations, ...pickArgs, false);
        }

        const location = locationResult && "_scoringReasoning" in locationResult
          ? (locationResult as Location & { _scoringReasoning?: string[]; _scoreBreakdown?: import("./scoring/locationScoring").ScoreBreakdown; _runnerUps?: { name: string; id: string }[] })
          : locationResult;
        const scoringData = location && "_scoringReasoning" in location ? {
          reasoning: location._scoringReasoning,
          breakdown: location._scoreBreakdown,
          runnerUps: (location as { _runnerUps?: { name: string; id: string }[] })._runnerUps,
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
            const recommendationReason = scoringData?.breakdown
              ? formatRecommendationReason(scoringData.breakdown, location, {
                  timeSlot,
                  alternativesConsidered: scoringData.runnerUps?.map((r) => r.name),
                })
              : undefined;

            // Build activity object with optional meal info for food locations
            // Only assign one full meal per slot (breakfast/lunch/dinner). Additional food places become "snacks"
            const isFood = isFoodCategory(location.category);
            const inferredMealType = isFood ? inferMealTypeFromTimeSlot(timeSlot) : undefined;

            // Check if this meal slot is already taken for this day
            let mealType: "breakfast" | "lunch" | "dinner" | "snack" | undefined;
            let mealNote: string | undefined;

            if (inferredMealType) {
              if (usedMealTypesForDay.has(inferredMealType)) {
                // Meal slot already filled - this becomes a snack/cafe visit
                mealType = "snack";
                mealNote = "Cafe / Snack stop";
              } else {
                // First meal of this type for the day
                mealType = inferredMealType;
                mealNote = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} spot`;
                usedMealTypesForDay.add(inferredMealType);
              }
            }

            const activity: Extract<ItineraryActivity, { kind: "place" }> = {
              kind: "place",
              id: `${location.id}-${dayIndex + 1}-${timeSlot}-${activityIndex + 1}`,
              title: location.name,
              timeOfDay: timeSlot,
              durationMin: locationDuration,
              locationId: location.id,
              coordinates: location.coordinates,
              neighborhood: location.neighborhood ?? location.city,
              tags: buildTags(interest, location.category),
              recommendationReason,
              ...(location.description && { description: location.description }),
              ...(mealType && { mealType }),
              ...(mealNote && { notes: mealNote }),
            };

            // Tag activities from editorial content
            if (contentLocationIds?.has(location.id)) {
              activity.tags = [...(activity.tags ?? []), "content-pick"];
              if (activity.recommendationReason) {
                activity.recommendationReason.primaryReason = `Featured in "${data.contentContext?.title}"`;
              }
            }

            dayActivities.push(activity);
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

    // Compute weekday from trip start date + day index
    const WEEKDAY_NAMES: import("@/types/location").Weekday[] = [
      "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    ];
    let weekday: import("@/types/location").Weekday | undefined;
    if (data.dates.start) {
      const parts = data.dates.start.split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + dayIndex);
      weekday = WEEKDAY_NAMES[d.getDay()];
    } else {
      weekday = "wednesday"; // Mid-week default, most venues open
    }

    days.push({
      id: dayId,
      dateLabel,
      weekday,
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

function resolveInterestSequence(data: TripBuilderData): InterestId[] {
  if (data.interests && data.interests.length > 0) {
    return data.interests;
  }
  return [...DEFAULT_INTEREST_ROTATION];
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

  const categoryMap: Record<string, string> = {
    shrine: "shrine",
    temple: "temple",
    landmark: "landmark",
    restaurant: "restaurant",
    market: "market",
    park: "park",
    garden: "garden",
    shopping: "shopping",
    bar: "bar",
    entertainment: "entertainment",
    museum: "museum",
    viewpoint: "viewpoint",
    nature: "nature",
    culture: "culture",
    onsen: "onsen",
    wellness: "wellness",
    cafe: "cafe",
    aquarium: "aquarium",
    beach: "beach",
    castle: "castle",
    historic_site: "historic site",
    theater: "theater",
    zoo: "zoo",
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


function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
