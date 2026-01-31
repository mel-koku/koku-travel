import { NextRequest, NextResponse } from "next/server";
import { refineDay, type RefinementType } from "@/lib/server/refinementEngine";
import { convertItineraryToTrip } from "@/lib/server/itineraryEngine";
import { badRequest, internalError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
} from "@/lib/api/middleware";
import { validateRequestBody } from "@/lib/api/schemas";
import { z } from "zod";
import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { Trip, TripActivity, TripDay } from "@/types/tripDomain";
import type { Location } from "@/types/location";
import { convertTripReasonToItineraryReason } from "@/lib/utils/recommendationAdapter";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import { transformDbRowToLocation } from "@/lib/locations/locationService";

// Simple stub request format (as specified in plan)
type RefineRequestBody = {
  trip: Trip;
  refinementType: RefinementType;
  dayIndex?: number;
};

// Legacy request format (for backward compatibility)
type RefinementRequest = {
  tripId: string;
  dayIndex: number;
  refinementType: RefinementType;
  itinerary: Itinerary;
  builderData: TripBuilderData;
};

type RefinementResponse = {
  refinedDay: ItineraryDay;
  updatedTrip: Trip;
};

const VALID_REFINEMENT_TYPES: RefinementType[] = [
  "too_busy",
  "too_light",
  "more_food",
  "more_culture",
  "more_kid_friendly",
  "more_rest",
];

/**
 * Fetches locations from Supabase database, optionally filtered by cities.
 *
 * @param cities - Optional array of city names to filter by (reduces memory usage)
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

    // Filter by cities if provided to reduce memory usage
    if (cities && cities.length > 0) {
      query = query.in("city", cities);
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

// Conversion function moved to @/lib/utils/recommendationAdapter

const mapTripActivityToItineraryActivity = (
  activity: TripActivity,
): Extract<ItineraryActivity, { kind: "place" }> => {
  const location = activity.location;
  return {
    kind: "place",
    id: activity.id,
    title: location?.name ?? activity.locationId,
    timeOfDay: activity.timeSlot,
    durationMin: activity.duration,
    locationId: activity.locationId,
    neighborhood: undefined, // Location type doesn't have neighborhood property
    tags: undefined, // Location type doesn't have tags property
    notes: activity.reasoning?.primaryReason,
    recommendationReason: convertTripReasonToItineraryReason(activity.reasoning),
    schedule:
      activity.startTime && activity.endTime
        ? {
            arrivalTime: activity.startTime,
            departureTime: activity.endTime,
          }
        : undefined,
    mealType: activity.mealType === "snack" ? undefined : activity.mealType,
    coordinates: location?.coordinates,
  };
};

const mapTripDayToItineraryDay = (day: TripDay): ItineraryDay => ({
  id: day.id,
  cityId: day.cityId,
  activities: day.activities.map(mapTripActivityToItineraryActivity),
});

/**
 * POST /api/itinerary/refine
 * 
 * Refines a specific day in an itinerary based on refinement type.
 * 
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Optional authentication (for future user-specific features)
  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  try {
    // Validate request body with size limit (2MB for trip data)
    // Note: refine endpoint accepts multiple formats (legacy and new), so we validate structure first
    // Using passthrough() to allow additional fields for backward compatibility
    // Schema must match VALID_REFINEMENT_TYPES for consistency
    const refineSchema = z.object({
      trip: z.any().optional(), // Trip object validation handled separately in refinement engine
      refinementType: z.enum(["too_busy", "too_light", "more_food", "more_culture", "more_kid_friendly", "more_rest"]).optional(),
      dayIndex: z.number().int().min(0).max(30).optional(),
      tripId: z.string().max(255).regex(/^[A-Za-z0-9._-]+$/, "Trip ID contains invalid characters").optional(),
      builderData: z.any().optional(), // Partial TripBuilderData - validated separately if provided
    }).passthrough(); // Allow additional fields for backward compatibility
    
    const bodyValidation = await validateRequestBody(
      request,
      refineSchema,
      2 * 1024 * 1024
    );
    
    if (!bodyValidation.success) {
      return addRequestContextHeaders(
        badRequest("Invalid request body", {
          errors: bodyValidation.error.issues,
        }, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    const body = bodyValidation.data;

    // Check if this is the simple stub format (trip domain model)
    if (body.trip && body.refinementType) {
      const { trip, refinementType, dayIndex } = body as RefineRequestBody;

      if (!trip || !refinementType) {
        return addRequestContextHeaders(
          badRequest("Missing trip or refinementType", undefined, {
            requestId: finalContext.requestId,
          }),
          finalContext,
        );
      }

      if (!VALID_REFINEMENT_TYPES.includes(refinementType)) {
        return addRequestContextHeaders(
          badRequest(`Invalid refinement type: ${refinementType}`, undefined, {
            requestId: finalContext.requestId,
          }),
          finalContext,
        );
      }

      // Default to day 0 if dayIndex not provided
      const targetDayIndex = dayIndex ?? 0;

      if (!trip.days[targetDayIndex]) {
        return addRequestContextHeaders(
          badRequest(`Day index ${targetDayIndex} not found in trip`, undefined, {
            requestId: finalContext.requestId,
          }),
          finalContext,
        );
      }

      // Perform actual refinement using refineDay function
      const refinedDay = await refineDay({
        trip,
        dayIndex: targetDayIndex,
        type: refinementType,
      });

      // Update the trip with the refined day
      const updatedDays = trip.days.map((day, index) =>
        index === targetDayIndex ? refinedDay : day
      );

      const refined: Trip = {
        ...trip,
        days: updatedDays,
        updatedAt: new Date().toISOString(),
      };

      return addRequestContextHeaders(
        NextResponse.json(
          {
            trip: refined,
            refinementType,
            dayIndex: targetDayIndex,
            message: `Successfully refined day ${targetDayIndex + 1} with ${refinementType} refinement.`,
          },
          { status: 200 }
        ),
        finalContext,
      );
    }

    // Legacy format (for backward compatibility)
    const { tripId, dayIndex, refinementType, builderData, itinerary } = body as RefinementRequest;

    if (!tripId || typeof dayIndex !== "number" || !refinementType) {
      return addRequestContextHeaders(
        badRequest("tripId, dayIndex, and refinementType are required", undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }
    if (!VALID_REFINEMENT_TYPES.includes(refinementType)) {
      return addRequestContextHeaders(
        badRequest(`Invalid refinement type: ${refinementType}`, undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }
    if (!builderData || !itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      return addRequestContextHeaders(
        badRequest("builderData and itinerary are required to refine a trip", undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    // Determine cities to filter by for optimized database queries
    const selectedCities = builderData.cities && builderData.cities.length > 0 ? builderData.cities : undefined;

    // Fetch locations from database (with fallback to mock data)
    const allLocations = await fetchAllLocations(selectedCities);
    const trip = convertItineraryToTrip(itinerary, builderData, tripId, allLocations);
    if (!trip.days[dayIndex]) {
      return addRequestContextHeaders(
        badRequest(`Day index ${dayIndex} not found for trip ${tripId}`, undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    const refinedDay = await refineDay({ trip, dayIndex, type: refinementType });
    const updatedDays = trip.days.map((day, index) => (index === dayIndex ? refinedDay : day));
    const updatedTrip: Trip = {
      ...trip,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    const responseBody: RefinementResponse = {
      refinedDay: mapTripDayToItineraryDay(refinedDay),
      updatedTrip,
    };

    return addRequestContextHeaders(
      NextResponse.json(responseBody),
      finalContext,
    );
  } catch (error) {
    logger.error(
      "Error refining itinerary day",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: finalContext.requestId },
    );
    return addRequestContextHeaders(
      internalError("Failed to refine day", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }
}
