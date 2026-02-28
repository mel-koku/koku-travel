import { generateItinerary } from "@/lib/itineraryGenerator";
import { planItinerary } from "@/lib/itineraryPlanner";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import type { Trip, TripDay, TripActivity } from "@/types/tripDomain";
import type { TripBuilderData } from "@/types/trip";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";
import { fetchAllLocations } from "@/lib/locations/locationService";
import { isDiningLocation } from "@/lib/mealFiltering";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
import { getCityCenterCoordinates } from "@/data/entryPoints";
import { generateDayIntros } from "./dayIntroGenerator";
import { getDayTripsFromCity } from "@/data/dayTrips";
import { getSeasonalHighlightForDate } from "@/lib/utils/seasonUtils";
import { fetchCommunityRatings } from "@/lib/ratings/communityRatings";

/**
 * Converts an Itinerary (legacy format) to Trip (domain model)
 */
export function convertItineraryToTrip(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  tripId: string,
  allLocations: Location[],
): Trip {
  const travelerProfile = builderData.travelerProfile ?? buildTravelerProfile(builderData);

  const startDate = builderData.dates.start ?? new Date().toISOString().split("T")[0] ?? "";
  const duration = builderData.duration ?? itinerary.days.length;

  if (!startDate) {
    throw new Error("Start date is required");
  }

  const startDateObj = new Date(startDate);
  if (Number.isNaN(startDateObj.getTime())) {
    throw new Error(`Invalid start date: ${startDate}`);
  }

  const endDateObj = new Date(startDateObj);
  endDateObj.setDate(startDateObj.getDate() + duration - 1);
  const endDate = endDateObj.toISOString().split("T")[0] ?? "";

  // Build a Map for O(1) location lookups by name (instead of O(n×m) using .find())
  const locationByName = new Map(allLocations.map((loc) => [loc.name, loc]));

  const days: TripDay[] = itinerary.days.map((day, index) => {
    const dayDate = new Date(startDateObj);
    dayDate.setDate(startDateObj.getDate() + index);
    const dateStr = dayDate.toISOString().split("T")[0] ?? "";

    if (!dateStr) {
      throw new Error(`Failed to generate date string for day ${index}`);
    }

    const activities: TripActivity[] = day.activities
      .filter((activity): activity is Extract<ItineraryActivity, { kind: "place" }> => activity.kind === "place")
      .map((activity) => {
        const location = locationByName.get(activity.title);
        return {
          id: activity.id,
          locationId: activity.locationId ?? location?.id ?? `unknown-${activity.id}`,
          location: location,
          timeSlot: activity.timeOfDay,
          duration: activity.durationMin ?? 90,
          startTime: activity.schedule?.arrivalTime,
          endTime: activity.schedule?.departureTime,
          mealType: activity.mealType ?? (activity.tags?.includes("dining") ? "lunch" : undefined),
        };
      });

    // Ensure cityId is set - use first city from builderData or default
    const cityId = day.cityId ?? builderData.cities?.[0] ?? "kyoto";

    return {
      id: day.id,
      date: dateStr,
      cityId,
      activities,
      explanation: generateDayExplanation(day, index, travelerProfile.pace),
    };
  });

  return {
    id: tripId,
    travelerProfile,
    dates: {
      start: startDate,
      end: endDate,
    },
    regions: builderData.regions ?? [],
    cities: builderData.cities ?? [],
    entryPoint: builderData.entryPoint,
    status: "planned",
    days,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generates explanation text for a day
 */
function generateDayExplanation(
  day: Itinerary["days"][number],
  dayIndex: number,
  pace: string,
): string {
  const activityCount = day.activities.length;
  const cityName = day.cityId ?? "the area";

  if (dayIndex === 0) {
    return `Day 1 is ${pace === "relaxed" ? "light" : pace === "fast" ? "packed" : "balanced"} to help with ${pace === "relaxed" ? "easing into" : "getting started in"} ${cityName}.`;
  }

  if (activityCount <= 2) {
    return `Day ${dayIndex + 1} is relaxed with fewer activities to allow for rest and exploration.`;
  }

  if (activityCount >= 5) {
    return `Day ${dayIndex + 1} is packed with activities to maximize your time in ${cityName}.`;
  }

  return `Day ${dayIndex + 1} offers a balanced mix of activities in ${cityName}.`;
}

/**
 * Optimize activity order for each day independently using nearest-neighbor algorithm.
 * Each day is optimized starting from the trip's entry point (airport/station).
 * Days are independent because users typically return to hotels at end of each day.
 */
function optimizeItineraryRoutes(
  itinerary: Itinerary,
  builderData: TripBuilderData
): Itinerary {
  // Use entry point as start for all days (airport/station where trip begins)
  const startPoint = builderData.entryPoint;

  const optimizedDays = itinerary.days.map((day, dayIndex) => {
    // Day 1: start from entry point. Days 2+: start from city center (hotel proxy).
    let dayStartPoint = startPoint;
    if (dayIndex > 0 && day.cityId) {
      const cityCoords = getCityCenterCoordinates(day.cityId);
      // Only coordinates are used by optimizeRouteOrder, so we can safely cast
      dayStartPoint = { coordinates: cityCoords } as typeof startPoint;
    }
    const result = optimizeRouteOrder(day.activities, dayStartPoint, dayStartPoint);

    if (!result.orderChanged) {
      return day;
    }

    const activityMap = new Map(day.activities.map(a => [a.id, a]));
    const reorderedActivities = result.order
      .map(id => activityMap.get(id))
      .filter((a): a is ItineraryActivity => a !== undefined);

    return { ...day, activities: reorderedActivities };
  });

  return { ...itinerary, days: optimizedDays };
}

/**
 * Result from generating a trip, including both domain model and storage format
 */
export type GeneratedTripResult = {
  trip: Trip;
  itinerary: Itinerary;
  dayIntros?: Record<string, string>;
};

/**
 * Generates an itinerary from TripBuilderData
 * Returns both a Trip domain model and the raw Itinerary for storage
 *
 * @param builderData - Trip configuration data
 * @param tripId - Unique identifier for the trip
 * @param savedIds - Optional array of saved location IDs to include in generation
 */
export async function generateTripFromBuilderData(
  builderData: TripBuilderData,
  tripId: string,
  savedIds?: string[],
): Promise<GeneratedTripResult> {
  const t0 = Date.now();

  // Fetch locations filtered by selected cities (after ward consolidation)
  // Also fetch day trip target cities for small selections (1-2 cities)
  // to prevent location exhaustion on longer trips
  let allLocations = await fetchAllLocations({ cities: builderData.cities });
  if (builderData.cities && builderData.cities.length <= 2) {
    const dayTripCityIds = new Set<string>();
    for (const cityId of builderData.cities) {
      const trips = getDayTripsFromCity(cityId);
      trips.forEach((t) => dayTripCityIds.add(t.cityId));
    }
    builderData.cities.forEach((c) => dayTripCityIds.delete(c));
    if (dayTripCityIds.size > 0) {
      const dayTripLocations = await fetchAllLocations({
        cities: Array.from(dayTripCityIds),
      });
      allLocations = [...allLocations, ...dayTripLocations];
    }
  }
  const t1 = Date.now();

  // Fetch community ratings for scoring blend (non-blocking — falls back to empty)
  const communityRatingsMap = await fetchCommunityRatings(
    allLocations.map((l) => l.id),
  );
  const communityRatings = communityRatingsMap.size > 0
    ? new Map([...communityRatingsMap.entries()].map(([k, v]) => [k, v.avgRating]))
    : undefined;

  // Generate itinerary using existing generator, including saved locations
  // Pass pre-fetched locations to avoid duplicate Supabase call inside generator
  const rawItinerary = await generateItinerary(builderData, { savedIds, locations: allLocations, communityRatings });
  const t2 = Date.now();

  // Optimize route order before planning times
  const optimizedItinerary = optimizeItineraryRoutes(rawItinerary, builderData);

  // Build dayEntryPoints so the planner knows where each day starts
  // Day 1: entry point (airport/station). Days 2+: city center (hotel proxy).
  const dayEntryPoints: Record<string, { startPoint?: { coordinates: { lat: number; lng: number } }; endPoint?: { coordinates: { lat: number; lng: number } } }> = {};
  for (let i = 0; i < optimizedItinerary.days.length; i++) {
    const day = optimizedItinerary.days[i];
    if (!day) continue;
    if (i === 0 && builderData.entryPoint?.coordinates) {
      // Day 1: start from airport/station, end at city center (hotel proxy)
      const endCoords = day.cityId
        ? getCityCenterCoordinates(day.cityId)
        : builderData.entryPoint.coordinates;
      dayEntryPoints[day.id] = {
        startPoint: { coordinates: builderData.entryPoint.coordinates },
        endPoint: { coordinates: endCoords },
      };
    } else if (day.cityId) {
      // Days 2+: start and end at city center (hotel proxy)
      const cityCoords = getCityCenterCoordinates(day.cityId);
      dayEntryPoints[day.id] = {
        startPoint: { coordinates: cityCoords },
        endPoint: { coordinates: cityCoords },
      };
    }
  }

  // Run planItinerary (routing) and Gemini day intros in parallel.
  // Day intros only need activity titles/cities — not scheduled times —
  // so we can use the pre-planning optimized itinerary for the prompt.
  const [itinerary, dayIntros] = await Promise.all([
    planItinerary(optimizedItinerary, {
      defaultDayStart: builderData.dayStartTime ?? "09:00",
      defaultDayEnd: builderData.accommodationStyle === "ryokan" ? "17:00" : undefined,
    }, dayEntryPoints),
    generateDayIntros(optimizedItinerary, builderData).catch(() => null),
  ]);
  const t3 = Date.now();

  logger.info("Itinerary generation timing", {
    locationsFetchMs: t1 - t0,
    generatorMs: t2 - t1,
    planningAndIntrosMs: t3 - t2,
    totalMs: t3 - t0,
    daysCount: itinerary.days.length,
    locationCount: allLocations.length,
    dayStartTime: builderData.dayStartTime ?? "09:00",
  });

  void isDiningLocation; // Silence unused import warning (used in commented code above)

  // Attach seasonal highlight if trip dates overlap a known event
  const startDate = builderData.dates.start;
  if (startDate) {
    const parts = startDate.split("-").map(Number);
    const startMonth = parts[1];
    const startDay = parts[2];
    if (startMonth && startDay) {
      const highlight = getSeasonalHighlightForDate(startMonth, startDay);
      if (highlight) {
        itinerary.seasonalHighlight = {
          id: highlight.id,
          label: highlight.label,
          description: highlight.description,
        };
      }
    }
  }

  // Convert to Trip domain model
  const trip = convertItineraryToTrip(itinerary, builderData, tripId, allLocations);

  return { trip, itinerary, dayIntros: dayIntros ?? undefined };
}

/**
 * Parse price level from minBudget string.
 * Returns numeric value or symbol count.
 */
function parsePriceLevel(minBudget?: string): { level: number; type: "numeric" | "symbol" } {
  if (!minBudget) {
    return { level: 0, type: "numeric" };
  }

  // Try to parse numeric value (e.g., "¥400")
  const numericMatch = minBudget.match(/¥?\s*(\d+)/);
  if (numericMatch) {
    return { level: parseInt(numericMatch[1] ?? "0", 10), type: "numeric" };
  }

  // Count symbols (e.g., "¥¥¥" = 3)
  const symbolCount = (minBudget.match(/¥/g) || []).length;
  if (symbolCount > 0) {
    return { level: symbolCount, type: "symbol" };
  }

  return { level: 0, type: "numeric" };
}

/**
 * Maximum activity duration per day in minutes (12 hours)
 */
const MAX_DAY_DURATION_MINUTES = 12 * 60;

/**
 * Budget tolerance threshold (10% over budget is acceptable)
 */
const BUDGET_TOLERANCE = 1.1;

/**
 * Validates that a day doesn't exceed the maximum activity duration
 */
function validateDayDuration(day: TripDay, dayIndex: number): string[] {
  const issues: string[] = [];
  const totalDuration = day.activities.reduce((sum, activity) => sum + activity.duration, 0);

  if (totalDuration > MAX_DAY_DURATION_MINUTES) {
    issues.push(
      `Day ${dayIndex + 1} is overpacked (${Math.round(totalDuration / 60)} hours of activities)`,
    );
  }

  return issues;
}

/**
 * Calculates the cost of a day's activities and validates against per-day budget
 */
function validateDayBudget(
  day: TripDay,
  dayIndex: number,
  perDayBudget: number | undefined,
): { issues: string[]; cost: number } {
  const issues: string[] = [];
  let dayCost = 0;

  day.activities.forEach((activity) => {
    if (activity.location?.minBudget) {
      const priceInfo = parsePriceLevel(activity.location.minBudget);
      if (priceInfo.type === "numeric" && priceInfo.level > 0) {
        dayCost += priceInfo.level;
      }
    }
  });

  if (perDayBudget !== undefined && dayCost > perDayBudget * BUDGET_TOLERANCE) {
    const percentOver = Math.round((dayCost / perDayBudget - 1) * 100);
    issues.push(
      `Day ${dayIndex + 1} exceeds per-day budget (¥${dayCost} vs ¥${perDayBudget} budget, ${percentOver}% over)`,
    );
  }

  return { issues, cost: dayCost };
}

/**
 * Validates that total trip cost doesn't exceed total budget
 */
function validateTotalBudget(totalCost: number, totalBudget: number | undefined): string[] {
  const issues: string[] = [];

  if (totalBudget !== undefined && totalCost > totalBudget * BUDGET_TOLERANCE) {
    const percentOver = Math.round((totalCost / totalBudget - 1) * 100);
    issues.push(
      `Total trip cost (¥${totalCost}) exceeds total budget (¥${totalBudget}, ${percentOver}% over)`,
    );
  }

  return issues;
}

/**
 * Validates that activities don't conflict with typical nap times (1pm-3pm)
 * Only applies when children are present in the travel group
 */
function validateNapScheduling(day: TripDay, dayIndex: number): string[] {
  const issues: string[] = [];

  const conflictingActivities = day.activities.filter((activity) => {
    if (!activity.startTime) return false;
    const parts = activity.startTime.split(":");
    if (parts.length < 1) return false;
    const hours = Number(parts[0]);
    if (Number.isNaN(hours)) return false;
    return hours >= 13 && hours < 15;
  });

  if (conflictingActivities.length > 0) {
    issues.push(`Day ${dayIndex + 1} has activities during typical nap time (1pm-3pm)`);
  }

  return issues;
}

/**
 * Validates that a trip meets soft constraints
 */
export function validateTripConstraints(trip: Trip): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for overpacked days
  trip.days.forEach((day, index) => {
    issues.push(...validateDayDuration(day, index));
  });

  // Check budget constraints
  const budget = trip.travelerProfile.budget;
  if (budget.perDay !== undefined || budget.total !== undefined) {
    let totalCost = 0;

    trip.days.forEach((day, index) => {
      const { issues: dayIssues, cost } = validateDayBudget(day, index, budget.perDay);
      issues.push(...dayIssues);
      totalCost += cost;
    });

    issues.push(...validateTotalBudget(totalCost, budget.total));
  }

  // Check for backtracking (simplified - would need routing data)
  // This is a placeholder for future implementation

  // Check nap windows if children present
  if (trip.travelerProfile.group.type === "family" && trip.travelerProfile.group.childrenAges) {
    trip.days.forEach((day, index) => {
      issues.push(...validateNapScheduling(day, index));
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

