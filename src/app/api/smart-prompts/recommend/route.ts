import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location, LocationAvailability } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GapAction } from "@/lib/smartPrompts/gapDetection";
import { findMealRecommendation } from "@/lib/mealPlanning";
import { scoreLocation } from "@/lib/scoring/locationScoring";
import { logger } from "@/lib/logger";
import { internalError, badRequest } from "@/lib/api/errors";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import {
  isSeasonalLocationRelevant,
  transformAvailabilityRow,
  type LocationAvailabilityRow,
} from "@/lib/availability/seasonalFilter";
import { transformDbRowToLocation } from "@/lib/locations/locationService";
import { filterByMealType } from "@/lib/mealFiltering";

/**
 * Default durations for different meal types in minutes
 */
const MEAL_DURATIONS: Record<string, number> = {
  breakfast: 45,
  lunch: 60,
  dinner: 90,
  snack: 30,
};

/**
 * Konbini tips and recommendations by meal type
 */
const KONBINI_INFO: Record<string, { title: string; tips: string }> = {
  breakfast: {
    title: "Konbini Breakfast",
    tips: "Try onigiri (rice balls), tamago sando (egg sandwich), or hot canned coffee. 7-Eleven, Lawson, and FamilyMart are everywhere and open 24/7.",
  },
  lunch: {
    title: "Konbini Lunch",
    tips: "Bento boxes, yakisoba, udon cups, or seasonal limited items. Most konbinis have a microwave and hot water. Don't miss the premium onigiri!",
  },
  dinner: {
    title: "Konbini Dinner",
    tips: "Hot nikuman (meat buns), oden in winter, or fresh bento. Perfect for a quick meal at your hotel after a long day of sightseeing.",
  },
};

/**
 * Generate a unique activity ID
 */
function generateActivityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Filter locations by seasonal availability based on trip dates.
 * Non-seasonal locations are always included.
 * Seasonal locations are only included if their availability overlaps with trip dates.
 */
async function filterBySeasonalAvailability(
  locations: Location[],
  tripStart: string | undefined,
  tripEnd: string | undefined,
  supabaseClient: Awaited<ReturnType<typeof createClient>>
): Promise<Location[]> {
  // If no trip dates, exclude all seasonal locations (can't determine relevance)
  if (!tripStart || !tripEnd) {
    return locations.filter((l) => !l.isSeasonal);
  }

  // Separate seasonal and non-seasonal locations
  const nonSeasonal = locations.filter((l) => !l.isSeasonal);
  const seasonal = locations.filter((l) => l.isSeasonal);

  if (seasonal.length === 0) {
    return nonSeasonal;
  }

  // Fetch availability rules for seasonal locations
  const seasonalIds = seasonal.map((l) => l.id);
  const { data: availabilityRows, error } = await supabaseClient
    .from("location_availability")
    .select("*")
    .in("location_id", seasonalIds);

  if (error) {
    logger.warn("Failed to fetch availability data, excluding seasonal locations", { error });
    return nonSeasonal;
  }

  // Group availability by location ID
  const availabilityByLocation = new Map<string, LocationAvailability[]>();
  for (const row of availabilityRows || []) {
    const transformed = transformAvailabilityRow(row as LocationAvailabilityRow);
    const existing = availabilityByLocation.get(transformed.locationId) || [];
    existing.push(transformed);
    availabilityByLocation.set(transformed.locationId, existing);
  }

  // Filter seasonal locations by date relevance
  const relevantSeasonal = seasonal.filter((location) => {
    const availability = availabilityByLocation.get(location.id);
    return isSeasonalLocationRelevant(
      location.isSeasonal,
      availability,
      tripStart,
      tripEnd
    );
  });

  return [...nonSeasonal, ...relevantSeasonal];
}

/**
 * Calculate the insertion position for a meal activity
 */
function calculateMealPosition(
  activities: ItineraryActivity[],
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  afterActivityId?: string
): number {
  // If we have a specific activity to insert after, find it
  if (afterActivityId) {
    const index = activities.findIndex((a) => a.id === afterActivityId);
    if (index >= 0) {
      return index + 1;
    }
  }

  // Default positions based on meal type
  switch (mealType) {
    case "breakfast":
      // Insert at the start of the day
      return 0;
    case "lunch":
      // Insert after morning activities
      const lastMorningIndex = activities.findLastIndex(
        (a) => a.kind === "place" && a.timeOfDay === "morning"
      );
      return lastMorningIndex >= 0 ? lastMorningIndex + 1 : Math.floor(activities.length / 2);
    case "dinner":
      // Insert at the end of the day (or before evening activities end)
      return activities.length;
    default:
      return activities.length;
  }
}

/**
 * Calculate the insertion position for an experience activity
 */
function calculateExperiencePosition(
  activities: ItineraryActivity[],
  timeSlot: "morning" | "afternoon" | "evening"
): number {
  switch (timeSlot) {
    case "morning":
      // Insert at position 0-1 (start of day)
      const firstNonMorning = activities.findIndex(
        (a) => a.kind === "place" && a.timeOfDay !== "morning"
      );
      return firstNonMorning >= 0 ? firstNonMorning : 0;
    case "afternoon":
      // Insert in the middle of the day
      const afternoonStart = activities.findIndex(
        (a) => a.kind === "place" && a.timeOfDay === "afternoon"
      );
      if (afternoonStart >= 0) {
        return afternoonStart;
      }
      return Math.floor(activities.length / 2);
    case "evening":
      // Insert at the end
      return activities.length;
    default:
      return activities.length;
  }
}

/**
 * Create a meal activity from a restaurant recommendation
 */
function createMealActivity(
  restaurant: Location,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  timeSlot: "morning" | "afternoon" | "evening"
): ItineraryActivity {
  return {
    kind: "place",
    id: generateActivityId(),
    title: restaurant.name,
    timeOfDay: timeSlot,
    durationMin: MEAL_DURATIONS[mealType] ?? 60,
    neighborhood: restaurant.neighborhood ?? restaurant.city,
    tags: ["dining", mealType],
    locationId: restaurant.id,
    coordinates: restaurant.coordinates,
    mealType: mealType,
    notes: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} recommendation`,
  };
}

/**
 * Create a konbini quick meal activity (note-based, no specific location)
 */
function createKonbiniActivity(
  mealType: "breakfast" | "lunch" | "dinner",
  timeSlot: "morning" | "afternoon" | "evening"
): ItineraryActivity {
  const info = KONBINI_INFO[mealType] ?? KONBINI_INFO["lunch"];
  const infoTitle = info?.title ?? "Konbini Meal";
  const infoTips = info?.tips ?? "Grab a quick meal from 7-Eleven, Lawson, or FamilyMart.";

  return {
    kind: "note",
    id: generateActivityId(),
    title: "Note",
    timeOfDay: timeSlot,
    notes: `**${infoTitle}**\n\n${infoTips}`,
  };
}

/**
 * Create an experience activity from a location
 */
function createExperienceActivity(
  location: Location,
  timeSlot: "morning" | "afternoon" | "evening"
): ItineraryActivity {
  return {
    kind: "place",
    id: generateActivityId(),
    title: location.name,
    timeOfDay: timeSlot,
    durationMin: location.recommendedVisit?.typicalMinutes ?? 90,
    neighborhood: location.neighborhood ?? location.city,
    tags: location.category ? [location.category] : undefined,
    locationId: location.id,
    coordinates: location.coordinates,
  };
}

type RecommendRequest = {
  gap: {
    id: string;
    type: string;
    dayId: string;
    dayIndex: number;
    action: GapAction;
  };
  dayActivities: ItineraryActivity[];
  cityId: string;
  tripBuilderData: TripBuilderData;
  usedLocationIds: string[];
};

type RecommendResponse = {
  recommendation: Location;
  activity: ItineraryActivity;
  position: number;
};

/**
 * POST /api/smart-prompts/recommend
 *
 * Fetches and scores recommendations for smart prompt suggestions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RecommendRequest;
    const { gap, dayActivities, cityId, tripBuilderData, usedLocationIds } = body;

    if (!gap || !gap.action) {
      return badRequest("Missing required gap action");
    }

    if (!cityId) {
      return badRequest("Missing cityId");
    }

    const supabase = await createClient();
    const usedIds = new Set(usedLocationIds || []);
    const action = gap.action;

    let recommendation: Location | null = null;
    let activity: ItineraryActivity | null = null;
    let position = 0;

    if (action.type === "add_meal") {
      // Fetch restaurants/food locations for this city (case-insensitive match)
      // Include both "restaurant" and "food" categories as data may use either
      // Note: place_id is not required - some locations may not have Google Places data
      // Note: business_status filter uses OR to include null values (SQL null != value returns null, not true)
      const { data: rows, error } = await supabase
        .from("locations")
        .select(LOCATION_ITINERARY_COLUMNS)
        .ilike("city", cityId)
        .in("category", ["restaurant", "food"])
        .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
        .limit(100);

      if (error) {
        logger.error("Failed to fetch restaurants", { error, cityId });
        return internalError("Failed to fetch restaurant recommendations");
      }

      const restaurants = (rows || []).map((row) =>
        transformDbRowToLocation(row as unknown as LocationDbRow)
      );

      // Filter by meal type (e.g., no breweries for breakfast)
      const mealAppropriate = filterByMealType(restaurants, action.mealType);

      // Filter out already-used locations
      const available = mealAppropriate.filter((r) => !usedIds.has(r.id));

      if (available.length === 0) {
        const message = restaurants.length === 0
          ? `No restaurant data available for ${cityId}. Try a different city like Kyoto or Fukuoka.`
          : "All restaurants for this city have already been added to your itinerary.";
        return NextResponse.json(
          { error: message },
          { status: 404 }
        );
      }

      // Find the best meal recommendation
      recommendation = findMealRecommendation(available, action.mealType, {
        interests: tripBuilderData.interests ?? [],
        travelStyle: tripBuilderData.style ?? "balanced",
        budgetLevel: tripBuilderData.budget?.level,
        budgetTotal: tripBuilderData.budget?.total,
        budgetPerDay: tripBuilderData.budget?.perDay,
        dietaryRestrictions: tripBuilderData.accessibility?.dietary ?? [],
        usedLocationIds: usedIds,
      });

      if (!recommendation) {
        return NextResponse.json(
          { error: "Could not find a suitable restaurant" },
          { status: 404 }
        );
      }

      activity = createMealActivity(recommendation, action.mealType, action.timeSlot);
      position = calculateMealPosition(dayActivities, action.mealType, action.afterActivityId);

    } else if (action.type === "quick_meal") {
      // Konbini quick meal - no database lookup needed, just create a note activity
      activity = createKonbiniActivity(action.mealType, action.timeSlot);
      position = calculateMealPosition(dayActivities, action.mealType, action.afterActivityId);

      // Return early since there's no location recommendation for konbini
      return NextResponse.json({
        recommendation: null,
        activity,
        position,
      }, { status: 200 });

    } else if (action.type === "add_experience") {
      // Fetch locations for this city (non-restaurants, case-insensitive match)
      // Note: place_id is not required - some locations may not have Google Places data
      // Note: business_status filter uses OR to include null values
      let query = supabase
        .from("locations")
        .select(LOCATION_ITINERARY_COLUMNS)
        .ilike("city", cityId)
        .neq("category", "restaurant")
        .neq("category", "food")
        .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
        .limit(100);

      // If a specific category is requested, filter by it
      if (action.category) {
        query = query.eq("category", action.category);
      }

      const { data: rows, error } = await query;

      if (error) {
        logger.error("Failed to fetch locations", { error, cityId });
        return internalError("Failed to fetch experience recommendations");
      }

      const locations = (rows || []).map((row) =>
        transformDbRowToLocation(row as unknown as LocationDbRow)
      );

      // Filter by seasonal availability based on trip dates
      // Seasonal locations (festivals, events) are only shown if trip dates overlap
      const tripStart = tripBuilderData.dates?.start;
      const tripEnd = tripBuilderData.dates?.end;
      const dateFiltered = await filterBySeasonalAvailability(
        locations,
        tripStart,
        tripEnd,
        supabase
      );

      // Filter out already-used locations
      const available = dateFiltered.filter((l) => !usedIds.has(l.id));

      if (available.length === 0) {
        const message = locations.length === 0
          ? `No experience data available for ${cityId}.`
          : "All experiences for this city have already been added to your itinerary.";
        return NextResponse.json(
          { error: message },
          { status: 404 }
        );
      }

      // Score and sort locations
      const scored = available.map((location) =>
        scoreLocation(location, {
          interests: tripBuilderData.interests ?? [],
          travelStyle: tripBuilderData.style ?? "balanced",
          budgetLevel: tripBuilderData.budget?.level,
          budgetTotal: tripBuilderData.budget?.total,
          budgetPerDay: tripBuilderData.budget?.perDay,
          availableMinutes: 120, // Default to 2 hours for experiences
          recentCategories: dayActivities
            .filter((a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place")
            .map((a) => a.tags?.[0] ?? "")
            .filter(Boolean),
          timeSlot: action.timeSlot,
        })
      );

      // Sort by score descending and pick top
      scored.sort((a, b) => b.score - a.score);
      const topScore = scored[0];

      if (!topScore) {
        return NextResponse.json(
          { error: "Could not find a suitable experience" },
          { status: 404 }
        );
      }

      recommendation = topScore.location;
      activity = createExperienceActivity(recommendation, action.timeSlot);
      position = calculateExperiencePosition(dayActivities, action.timeSlot);
    } else {
      return badRequest(`Unknown action type: ${(action as { type: string }).type}`);
    }

    const response: RecommendResponse = {
      recommendation,
      activity,
      position,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logger.error("Smart prompts recommend error", error instanceof Error ? error : new Error(String(error)));
    return internalError("Failed to generate recommendation");
  }
}
