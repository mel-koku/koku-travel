import { generateItinerary } from "@/lib/itineraryGenerator";
import { planItinerary } from "@/lib/itineraryPlanner";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import type { Trip, TripDay, TripActivity } from "@/types/tripDomain";
import type { TripBuilderData } from "@/types/trip";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
// Note: insertMealActivities is disabled in favor of post-generation smart prompts
// import { insertMealActivities } from "@/lib/mealPlanning";
import { logger } from "@/lib/logger";
import { fetchAllLocations } from "@/lib/locations/locationService";
import { isDiningLocation } from "@/lib/mealFiltering";

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
 * Result from generating a trip, including both domain model and storage format
 */
export type GeneratedTripResult = {
  trip: Trip;
  itinerary: Itinerary;
};

/**
 * Generates an itinerary from TripBuilderData
 * Returns both a Trip domain model and the raw Itinerary for storage
 */
export async function generateTripFromBuilderData(
  builderData: TripBuilderData,
  tripId: string,
): Promise<GeneratedTripResult> {
  // Fetch locations filtered by selected cities (after ward consolidation)
  const allLocations = await fetchAllLocations({ cities: builderData.cities });

  // Generate itinerary using existing generator
  const rawItinerary = await generateItinerary(builderData);

  // Schedule the itinerary to add arrival/departure times
  // This uses the dayStartTime from builderData or defaults to 09:00
  const itinerary = await planItinerary(rawItinerary, {
    defaultDayStart: builderData.dayStartTime ?? "09:00",
  });
  logger.info("Scheduled itinerary with times", {
    dayStartTime: builderData.dayStartTime ?? "09:00",
    daysCount: itinerary.days.length,
  });

  // Auto-meal insertion is disabled in favor of post-generation smart prompts.
  // Users can now choose to add meals via the SmartPromptsDrawer after viewing
  // their generated itinerary. This provides more control and transparency.
  //
  // To re-enable auto-meal insertion, uncomment the following code:
  //
  // const restaurants = allLocations.filter(isDiningLocation);
  // const usedLocationIds = new Set<string>();
  // const usedLocationNames = new Set<string>();
  // for (const day of itinerary.days) {
  //   for (const activity of day.activities) {
  //     if (activity.kind === "place" && activity.locationId) {
  //       usedLocationIds.add(activity.locationId);
  //     }
  //     if (activity.kind === "place" && activity.title) {
  //       usedLocationNames.add(activity.title.toLowerCase().trim());
  //     }
  //   }
  // }
  // const daysWithMeals: typeof itinerary.days = [];
  // for (const day of itinerary.days) {
  //   const dayWithMeals = await insertMealActivities(
  //     day,
  //     builderData,
  //     restaurants,
  //     usedLocationIds,
  //     usedLocationNames,
  //   );
  //   daysWithMeals.push(dayWithMeals);
  // }
  // itinerary = { ...itinerary, days: daysWithMeals };
  void isDiningLocation; // Silence unused import warning (used in commented code above)

  // Convert to Trip domain model
  const trip = convertItineraryToTrip(itinerary, builderData, tripId, allLocations);

  return { trip, itinerary };
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

