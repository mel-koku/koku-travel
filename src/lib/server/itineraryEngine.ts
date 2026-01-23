import { generateItinerary } from "@/lib/itineraryGenerator";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import type { Trip, TripDay, TripActivity } from "@/types/tripDomain";
import type { TripBuilderData } from "@/types/trip";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { insertMealActivities } from "@/lib/mealPlanning";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import { logger } from "@/lib/logger";
import { transformDbRowToLocation } from "@/lib/locations/locationService";

/**
 * Fetches locations from Supabase database.
 *
 * City filtering is enabled after ward consolidation (e.g., "Sakyo Ward" → "Kyoto").
 * The database now uses normalized city names that match trip builder city IDs.
 */
async function fetchAllLocations(cities?: string[]): Promise<Location[]> {
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
    if (cities && cities.length > 0) {
      // Capitalize city names to match database format (e.g., "kyoto" → "Kyoto")
      const normalizedCities = cities.map(
        (c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
      );
      query = query.in("city", normalizedCities);
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
    const locations: Location[] = (data as unknown as LocationDbRow[]).map((row) =>
      transformDbRowToLocation(row),
    );

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

  return allLocations;
}

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
        const location = allLocations.find((loc) => loc.name === activity.title);
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
  const allLocations = await fetchAllLocations(builderData.cities);

  // Generate itinerary using existing generator
  let itinerary = await generateItinerary(builderData);

  // Get restaurants for meal planning
  // Filter for actual dining establishments, excluding landmarks and closed locations
  const DINING_CATEGORIES = ["restaurant", "bar", "market", "food"];
  const LANDMARK_PATTERNS = /castle|shrine|temple|museum|palace|tower|park|garden|observatory|gate|historic|heritage|ruins|monument|jo\b|jinja|jingu|dera|taisha|-ji\b|城|神社|寺|塔|門/i;

  // Google Places types that indicate dining establishments
  const DINING_GOOGLE_TYPES = [
    "restaurant",
    "cafe",
    "coffee_shop",
    "bar",
    "bakery",
    "ramen_restaurant",
    "sushi_restaurant",
    "japanese_restaurant",
    "fast_food_restaurant",
    "meal_takeaway",
  ];

  const restaurants = allLocations.filter(
    (loc) => {
      // Exclude permanently closed locations
      if (loc.businessStatus === "PERMANENTLY_CLOSED") {
        return false;
      }

      // Check Google primary type first (most accurate)
      if (loc.googlePrimaryType && DINING_GOOGLE_TYPES.includes(loc.googlePrimaryType)) {
        return true;
      }

      // Check Google types array
      if (loc.googleTypes?.some(type => DINING_GOOGLE_TYPES.includes(type))) {
        return true;
      }

      // Fallback to category-based filtering
      // Must be in a dining category
      const isDiningCategory = DINING_CATEGORIES.includes(loc.category || "");
      // Must NOT match landmark name patterns (safety check for miscategorized locations)
      const isLandmark = LANDMARK_PATTERNS.test(loc.name);
      // Include if it's a restaurant keyword even if category is wrong
      const hasRestaurantKeyword = /restaurant|ramen|sushi|izakaya|cafe|café|dining/i.test(loc.name);

      return (isDiningCategory && !isLandmark) || (hasRestaurantKeyword && !isLandmark);
    }
  );

  // Insert meal activities into each day
  const daysWithMeals = await Promise.all(
    itinerary.days.map((day) => insertMealActivities(day, builderData, restaurants)),
  );
  itinerary = {
    ...itinerary,
    days: daysWithMeals,
  };

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
 * Validates that a trip meets soft constraints
 */
export function validateTripConstraints(trip: Trip): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for overpacked days
  trip.days.forEach((day, index) => {
    const totalDuration = day.activities.reduce((sum, activity) => sum + activity.duration, 0);
    const maxDuration = 12 * 60; // 12 hours in minutes

    if (totalDuration > maxDuration) {
      issues.push(`Day ${index + 1} is overpacked (${Math.round(totalDuration / 60)} hours of activities)`);
    }
  });

  // Check budget constraints
  const budget = trip.travelerProfile.budget;
  if (budget.perDay !== undefined || budget.total !== undefined) {
    let totalCost = 0;
    
    trip.days.forEach((day, index) => {
      let dayCost = 0;
      
      day.activities.forEach((activity) => {
        if (activity.location?.minBudget) {
          const priceInfo = parsePriceLevel(activity.location.minBudget);
          if (priceInfo.type === "numeric" && priceInfo.level > 0) {
            dayCost += priceInfo.level;
            totalCost += priceInfo.level;
          }
        }
      });

      // Check per-day budget
      if (budget.perDay !== undefined && dayCost > budget.perDay * 1.1) {
        issues.push(`Day ${index + 1} exceeds per-day budget (¥${dayCost} vs ¥${budget.perDay} budget, ${Math.round((dayCost / budget.perDay - 1) * 100)}% over)`);
      }
    });

    // Check total budget
    if (budget.total !== undefined && totalCost > budget.total * 1.1) {
      issues.push(`Total trip cost (¥${totalCost}) exceeds total budget (¥${budget.total}, ${Math.round((totalCost / budget.total - 1) * 100)}% over)`);
    }
  }

  // Check for backtracking (simplified - would need routing data)
  // This is a placeholder for future implementation

  // Check nap windows if children present
  if (trip.travelerProfile.group.type === "family" && trip.travelerProfile.group.childrenAges) {
    trip.days.forEach((day, index) => {
      // Check if activities conflict with typical nap times (1pm-3pm)
      const conflictingActivities = day.activities.filter((activity) => {
        if (!activity.startTime) return false;
        const parts = activity.startTime.split(":");
        if (parts.length < 1) return false;
        const hours = Number(parts[0]);
        if (Number.isNaN(hours)) return false;
        return hours >= 13 && hours < 15;
      });

      if (conflictingActivities.length > 0) {
        issues.push(`Day ${index + 1} has activities during typical nap time (1pm-3pm)`);
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

