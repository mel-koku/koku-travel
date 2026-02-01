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
 * Google types that are NOT appropriate for breakfast
 */
const NOT_BREAKFAST_TYPES = new Set([
  "bar",
  "night_club",
  "pub",
  "wine_bar",
  "cocktail_bar",
  "brewery",
  "izakaya",
]);

/**
 * Keywords in name/description that indicate NOT appropriate for breakfast
 * Used as fallback when no Google data is available
 */
const NOT_BREAKFAST_KEYWORDS = [
  "izakaya",
  "bar",
  "pub",
  "brewery",
  "sake",
  "cocktail",
  "night",
  "ramen",     // Ramen is typically lunch/dinner in Japan
  "gyoza",     // Usually dinner food
  "sukiyaki",  // Hot pot - dinner experience
  "shabu",     // Shabu-shabu hot pot - dinner
  "yakiniku",  // BBQ - dinner
  "yakitori",  // Grilled skewers - evening/night
];

/**
 * Keywords that indicate a place IS appropriate for breakfast
 */
const BREAKFAST_KEYWORDS = [
  "cafe",
  "café",
  "coffee",
  "breakfast",
  "brunch",
  "morning",
  "bakery",
  "toast",
  "egg",
  "pancake",
];

/**
 * Keywords that indicate dessert/snack places (not meals)
 */
const DESSERT_KEYWORDS = [
  "soft serve",
  "ice cream",
  "gelato",
  "dessert",
  "sweets",
  "parfait",
  "cake shop",
  "patisserie",
];

/**
 * Check if name or description contains any of the keywords
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Filter restaurants suitable for a specific meal type
 * Uses mealOptions, operating hours, Google type, and name/description keywords as signals
 */
function filterByMealType(
  restaurants: Location[],
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
): Location[] {
  return restaurants.filter((restaurant) => {
    const mealOptions = restaurant.mealOptions;
    const googleType = restaurant.googlePrimaryType?.toLowerCase() ?? "";
    const googleTypes = restaurant.googleTypes ?? [];
    const nameAndDesc = `${restaurant.name} ${restaurant.shortDescription ?? ""} ${restaurant.description ?? ""}`;
    const hasGoogleData = googleType !== "" || googleTypes.length > 0;

    // For breakfast, exclude bars/breweries/pubs and other inappropriate places
    if (mealType === "breakfast") {
      // Check if it's a bar/brewery type (Google data)
      const isBarType = NOT_BREAKFAST_TYPES.has(googleType) ||
        googleTypes.some(t => NOT_BREAKFAST_TYPES.has(t.toLowerCase()));

      if (isBarType) {
        return false;
      }

      // Fallback: Check name/description for bar/izakaya/ramen keywords when no Google data
      if (!hasGoogleData) {
        // Exclude if contains not-breakfast keywords
        if (containsKeyword(nameAndDesc, NOT_BREAKFAST_KEYWORDS)) {
          return false;
        }
        // Exclude dessert places from breakfast (soft serve, ice cream, etc.)
        if (containsKeyword(nameAndDesc, DESSERT_KEYWORDS)) {
          return false;
        }
        // Prefer places with breakfast keywords
        if (containsKeyword(nameAndDesc, BREAKFAST_KEYWORDS)) {
          return true;
        }
      }

      // If we have mealOptions, use it
      if (mealOptions) {
        // Prefer places that serve breakfast or brunch
        if (mealOptions.servesBreakfast === true || mealOptions.servesBrunch === true) {
          return true;
        }
        // Exclude if explicitly doesn't serve breakfast and we have data
        if (mealOptions.servesBreakfast === false && mealOptions.servesBrunch === false) {
          return false;
        }
      }

      // Check operating hours - breakfast places should open before 10am
      if (restaurant.operatingHours?.periods) {
        const today = new Date().getDay(); // 0 = Sunday
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayPeriod = restaurant.operatingHours.periods.find(
          p => p.day === dayNames[today]
        );
        if (todayPeriod?.open) {
          const openHour = parseInt(todayPeriod.open.split(":")[0] ?? "12", 10);
          // If opens after 11am, not a breakfast place
          if (openHour >= 11) {
            return false;
          }
        }
      }

      // Include cafes for breakfast
      if (googleType === "cafe" || googleTypes.includes("cafe")) {
        return true;
      }
    }

    // For lunch, check if serves lunch and operating hours
    if (mealType === "lunch") {
      if (mealOptions) {
        if (mealOptions.servesLunch === true) {
          return true;
        }
        if (mealOptions.servesLunch === false) {
          // Only exclude if we have explicit data that it doesn't serve lunch
          // and it's specifically a dinner-only place
          if (mealOptions.servesDinner === true && !mealOptions.servesBreakfast) {
            return false;
          }
        }
      }

      // Check operating hours - exclude places that only open for dinner (after 5pm)
      if (restaurant.operatingHours?.periods) {
        const today = new Date().getDay(); // 0 = Sunday
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayPeriod = restaurant.operatingHours.periods.find(
          p => p.day === dayNames[today]
        );
        if (todayPeriod?.open) {
          const openHour = parseInt(todayPeriod.open.split(":")[0] ?? "12", 10);
          // If opens at 5pm or later, it's a dinner-only place
          if (openHour >= 17) {
            return false;
          }
        }
      }
    }

    // For dinner, check if serves dinner and operating hours
    if (mealType === "dinner") {
      if (mealOptions) {
        if (mealOptions.servesDinner === true) {
          return true;
        }
        if (mealOptions.servesDinner === false) {
          // Only exclude if it's specifically breakfast/lunch only
          if (mealOptions.servesBreakfast || mealOptions.servesLunch) {
            return false;
          }
        }
      }

      // Check operating hours - exclude places that close early (before 6pm)
      if (restaurant.operatingHours?.periods) {
        const today = new Date().getDay(); // 0 = Sunday
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayPeriod = restaurant.operatingHours.periods.find(
          p => p.day === dayNames[today]
        );
        if (todayPeriod?.close) {
          const closeHour = parseInt(todayPeriod.close.split(":")[0] ?? "22", 10);
          // If closes before 6pm, it's not open for dinner
          if (closeHour < 18) {
            return false;
          }
        }
      }
    }

    // Default: include if no disqualifying criteria
    return true;
  });
}

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

      // Filter out already-used locations
      const available = locations.filter((l) => !usedIds.has(l.id));

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
