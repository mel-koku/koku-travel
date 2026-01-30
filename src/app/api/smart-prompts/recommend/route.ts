import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GapAction } from "@/lib/smartPrompts/gapDetection";
import { findMealRecommendation } from "@/lib/mealPlanning";
import { scoreLocation } from "@/lib/scoring/locationScoring";
import { logger } from "@/lib/logger";
import { internalError, badRequest } from "@/lib/api/errors";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";

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
 * Generate a unique activity ID
 */
function generateActivityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Transform database row to Location type
 */
function transformDbRowToLocation(row: LocationDbRow): Location {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    neighborhood: row.neighborhood ?? undefined,
    category: row.category,
    image: row.image,
    description: row.description ?? undefined,
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
    googlePrimaryType: row.google_primary_type ?? undefined,
    googleTypes: row.google_types ?? undefined,
    businessStatus: row.business_status as Location["businessStatus"] ?? undefined,
    mealOptions: row.meal_options ?? undefined,
    goodForChildren: row.good_for_children ?? undefined,
    goodForGroups: row.good_for_groups ?? undefined,
    outdoorSeating: row.outdoor_seating ?? undefined,
    reservable: row.reservable ?? undefined,
    editorialSummary: row.editorial_summary ?? undefined,
    isSeasonal: row.is_seasonal ?? undefined,
    seasonalType: row.seasonal_type ?? undefined,
  };
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
      // Fetch restaurants for this city
      const { data: rows, error } = await supabase
        .from("locations")
        .select(LOCATION_ITINERARY_COLUMNS)
        .eq("city", cityId)
        .eq("category", "restaurant")
        .not("place_id", "is", null)
        .neq("place_id", "")
        .neq("business_status", "PERMANENTLY_CLOSED")
        .limit(100);

      if (error) {
        logger.error("Failed to fetch restaurants", { error, cityId });
        return internalError("Failed to fetch restaurant recommendations");
      }

      const restaurants = (rows || []).map((row) =>
        transformDbRowToLocation(row as unknown as LocationDbRow)
      );

      // Filter out already-used locations
      const available = restaurants.filter((r) => !usedIds.has(r.id));

      if (available.length === 0) {
        return NextResponse.json(
          { error: "No available restaurant recommendations" },
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

    } else if (action.type === "add_experience") {
      // Fetch locations for this city (non-restaurants)
      let query = supabase
        .from("locations")
        .select(LOCATION_ITINERARY_COLUMNS)
        .eq("city", cityId)
        .neq("category", "restaurant")
        .not("place_id", "is", null)
        .neq("place_id", "")
        .neq("business_status", "PERMANENTLY_CLOSED")
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

      // Filter out already-used locations
      const available = locations.filter((l) => !usedIds.has(l.id));

      if (available.length === 0) {
        return NextResponse.json(
          { error: "No available experience recommendations" },
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
