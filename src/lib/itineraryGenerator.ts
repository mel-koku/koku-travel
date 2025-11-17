import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { CITY_TO_REGION, REGIONS } from "@/data/regions";
import type { Itinerary, ItineraryTravelMode } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { CityId, InterestId, RegionId, TripBuilderData } from "@/types/trip";
import type { WeatherForecast, TripWeatherContext } from "@/types/weather";
import { getNearestCityToEntryPoint, travelMinutes } from "./travelTime";
import { getCategoryDefaultDuration } from "./durationExtractor";
import { scoreLocation, type LocationScoringCriteria } from "@/lib/scoring/locationScoring";
import { applyDiversityFilter, type DiversityContext } from "@/lib/scoring/diversityRules";
import { fetchWeatherForecast } from "./weather/weatherService";
import { logger } from "@/lib/logger";

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

type LocationCategory = (typeof MOCK_LOCATIONS)[number]["category"];

type CityInfo = {
  key: string;
  label: string;
  regionId?: RegionId;
};

const REGION_ID_BY_LABEL = new Map<string, RegionId>();
const CITY_INFO_BY_KEY = new Map<string, CityInfo>();

REGIONS.forEach((region) => {
  REGION_ID_BY_LABEL.set(normalizeKey(region.name), region.id);
  region.cities.forEach((city) => {
    const key = normalizeKey(city.id);
    CITY_INFO_BY_KEY.set(key, { key, label: city.name, regionId: region.id });
  });
});

const LOCATIONS_BY_CITY_KEY = new Map<string, Location[]>();
const LOCATIONS_BY_REGION_ID = new Map<RegionId, Location[]>();
const ALL_LOCATIONS: Location[] = [...MOCK_LOCATIONS];

MOCK_LOCATIONS.forEach((location) => {
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

  const cityList = LOCATIONS_BY_CITY_KEY.get(cityKey);
  if (cityList) {
    cityList.push(location);
  } else {
    LOCATIONS_BY_CITY_KEY.set(cityKey, [location]);
  }

  if (info.regionId) {
    const regionList = LOCATIONS_BY_REGION_ID.get(info.regionId);
    if (regionList) {
      regionList.push(location);
    } else {
      LOCATIONS_BY_REGION_ID.set(info.regionId, [location]);
    }
  }
});

LOCATIONS_BY_CITY_KEY.forEach((locations) => locations.sort((a, b) => a.name.localeCompare(b.name)));
LOCATIONS_BY_REGION_ID.forEach((locations) => locations.sort((a, b) => a.name.localeCompare(b.name)));

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

export async function generateItinerary(data: TripBuilderData): Promise<Itinerary> {
  const totalDays =
    typeof data.duration === "number" && data.duration > 0 ? data.duration : DEFAULT_TOTAL_DAYS;

  const citySequence = resolveCitySequence(data);
  const expandedCitySequence = expandCitySequenceForDays(citySequence, totalDays);
  const interestSequence = resolveInterestSequence(data);
  const usedLocations = new Set<string>();
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

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const cityInfo = expandedCitySequence[dayIndex];
    if (!cityInfo) {
      throw new Error(`City info not found for day ${dayIndex}`);
    }

    // Get available locations for this city
    const cityLocations = LOCATIONS_BY_CITY_KEY.get(cityInfo.key) ?? [];
    const regionLocations = cityInfo.regionId
      ? LOCATIONS_BY_REGION_ID.get(cityInfo.regionId) ?? []
      : [];
    const availableLocations = cityLocations.length > 0 ? cityLocations : regionLocations;

    const dayActivities: Itinerary["days"][number]["activities"] = [];
    const dayCityUsage = new Map<string, number>();

    // Track time used in each slot
    const timeSlotUsage = new Map<typeof TIME_OF_DAY_SEQUENCE[number], number>();
    TIME_OF_DAY_SEQUENCE.forEach((slot) => timeSlotUsage.set(slot, 0));

    // Track interest cycling across the entire day (not per time slot)
    let interestIndex = 0;

    // Track categories for diversity and last location for distance
    const dayCategories: string[] = [];
    let lastLocation: Location | undefined;

    // Fill each time slot intelligently
    for (const timeSlot of TIME_OF_DAY_SEQUENCE) {
      const availableMinutes = getAvailableTimeForSlot(timeSlot, pace);
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
        );
        
        const location = locationResult && "_scoringReasoning" in locationResult 
          ? (locationResult as Location & { _scoringReasoning?: string[]; _scoreBreakdown?: import("./scoring/locationScoring").ScoreBreakdown })
          : locationResult;
        const scoringData = location && "_scoringReasoning" in location ? {
          reasoning: location._scoringReasoning,
          breakdown: location._scoreBreakdown,
        } : null;

        if (!location) {
          // If no location fits, try next interest
          interestIndex++;
          if (interestIndex >= interestSequence.length * 2) {
            // Prevent infinite loop
            break;
          }
          continue;
        }

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
              neighborhood: location.city,
              tags: buildTags(interest, location.category),
              recommendationReason,
            });
            usedLocations.add(location.id);
            remainingTime -= timeNeeded;
            timeSlotUsage.set(timeSlot, (timeSlotUsage.get(timeSlot) ?? 0) + timeNeeded);
            
            // Track category and location for diversity and distance
            if (location.category) {
              dayCategories.push(location.category);
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
    }

    const previousDay = dayIndex > 0 ? days[dayIndex - 1] : undefined;
    const previousLocation =
      previousDay && previousDay.activities.length > 0
        ? MOCK_LOCATIONS.find((loc) => {
            const lastActivity = previousDay.activities[previousDay.activities.length - 1];
            return lastActivity && loc.name === lastActivity.title;
          })
        : undefined;

    // Determine city ID for this day
    const dayCityId = cityInfo.key as CityId | undefined;

    // Generate a stable ID for this day
    // Use a combination of day index and random string for uniqueness
    const randomSuffix = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    const dayId = `day-${dayIndex + 1}-${randomSuffix}`;
    
    days.push({
      id: dayId,
      dateLabel: buildDayTitle(dayIndex, cityInfo.key),
      cityId: dayCityId,
      activities: dayActivities,
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

function resolveCitySequence(data: TripBuilderData): CityInfo[] {
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
    if (!LOCATIONS_BY_CITY_KEY.has(cityKey)) {
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
    const firstLocation = ALL_LOCATIONS[0];
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
    const regionId = CITY_TO_REGION[city];
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
      const nearestRegion = CITY_TO_REGION[nearestCity];
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
): Location | undefined {
  const cityLocations = LOCATIONS_BY_CITY_KEY.get(cityInfo.key);
  if (!cityLocations || cityLocations.length === 0) {
    if (cityInfo.regionId) {
      const regionLocations = LOCATIONS_BY_REGION_ID.get(cityInfo.regionId);
      if (regionLocations && regionLocations.length > 0) {
        return pickFromList(regionLocations, interest, usedLocations);
      }
    }
    return pickFromList(ALL_LOCATIONS, interest, usedLocations);
  }

  return pickFromList(cityLocations, interest, usedLocations);
}

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

  if (unused.length === 0) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const preferred = unused.filter((loc) => preferredCategories.includes(loc.category));
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)];
  }

  return unused[Math.floor(Math.random() * unused.length)];
}

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
): (Location & { _scoringReasoning?: string[]; _scoreBreakdown?: import("./scoring/locationScoring").ScoreBreakdown }) | undefined {
  const unused = list.filter((loc) => !usedLocations.has(loc.id));

  if (unused.length === 0) {
    return list[Math.floor(Math.random() * list.length)];
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
    weatherForecast,
    weatherPreferences,
    timeSlot,
    date,
    group,
  };

  const scored = unused.map((loc) => scoreLocation(loc, criteria));

  // Apply diversity filter
  const diversityContext: DiversityContext = {
    recentCategories,
    visitedLocationIds: usedLocations,
    currentDay: 0, // TODO: Pass from generator if needed
    energyLevel: 100,
  };

  const filtered = applyDiversityFilter(scored, diversityContext);

  // Sort by score, descending
  filtered.sort((a, b) => b.score - a.score);

  // Pick from top 5 with some randomness to avoid identical itineraries
  const topCandidates = filtered.slice(0, Math.min(5, filtered.length));
  if (topCandidates.length === 0) {
    // Fallback if all filtered out
    return unused[Math.floor(Math.random() * unused.length)];
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
  const region = CITY_TO_REGION[cityKey as CityId];
  if (region) {
    const cityInfo = CITY_INFO_BY_KEY.get(cityKey);
    const cityLabel = cityInfo?.label ?? capitalize(cityKey);
    return `Day ${dayIndex + 1} (${cityLabel})`;
  }
  
  for (const [regionId, cities] of Object.entries(CITY_TO_REGION)) {
    if (cities.includes(cityKey as CityId)) {
      const region = REGIONS.find((r) => r.id === regionId);
      if (region) {
        const city = region.cities.find((c) => c.id === cityKey);
        if (city) {
          return `Day ${dayIndex + 1} (${city.name})`;
        }
      }
    }
  }
  const info = CITY_INFO_BY_KEY.get(cityKey);
  const label = info?.label ?? capitalize(cityKey);
  return `Day ${dayIndex + 1} (${label})`;
}

function findAnyCityForRegion(regionId: RegionId): string | undefined {
  const region = REGIONS.find((r) => r.id === regionId);
  if (region && region.cities.length > 0) {
    for (const city of region.cities) {
      const cityKey = normalizeKey(city.id);
      if (LOCATIONS_BY_CITY_KEY.has(cityKey)) {
        return cityKey;
      }
    }
  }
  const regionLocations = LOCATIONS_BY_REGION_ID.get(regionId);
  if (regionLocations && regionLocations.length > 0) {
    const firstLocation = regionLocations[0];
    if (firstLocation) {
      return normalizeKey(firstLocation.city);
    }
  }
  return undefined;
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
