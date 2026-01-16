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
import type { Itinerary, ItineraryActivity, ItineraryDay, RecommendationReason as ItineraryRecommendationReason } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { Trip, TripActivity, TripDay, RecommendationReason as TripRecommendationReason } from "@/types/tripDomain";
import type { Location } from "@/types/location";
import { MOCK_LOCATIONS } from "@/data/mocks/mockLocations";
import { createClient } from "@/lib/supabase/server";

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
 * Fetches all locations from Supabase database.
 * In production, throws errors if database is unavailable.
 * In development, falls back to mock data for easier local development.
 */
async function fetchAllLocations(): Promise<Location[]> {
  const isDevelopment = process.env.NODE_ENV === "development";

  try {
    const supabase = await createClient();
    const allLocations: Location[] = [];
    let page = 0;
    const limit = 100; // Max per page
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name", { ascending: true })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) {
        const errorMessage = `Failed to fetch locations from database: ${error.message}`;
        if (isDevelopment) {
          logger.warn(errorMessage + " Falling back to mock data.", { error: error.message, page });
          return [...MOCK_LOCATIONS];
        } else {
          logger.error(errorMessage, { error: error.message, page });
          throw new Error(errorMessage);
        }
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Transform Supabase data to Location type
      const locations: Location[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        region: row.region,
        city: row.city,
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
      if (isDevelopment) {
        logger.warn(errorMessage + " Falling back to mock data.");
        return [...MOCK_LOCATIONS];
      } else {
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }

    return allLocations;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof Error && !isDevelopment) {
      throw error;
    }

    // In development, fall back to mock data
    if (isDevelopment) {
      logger.warn("Error fetching locations from database, falling back to mock data", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [...MOCK_LOCATIONS];
    }

    // In production, fail loudly
    const errorMessage = `Failed to fetch locations from database: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMessage, { error });
    throw new Error(errorMessage);
  }
}

const convertRecommendationReason = (
  reason: TripRecommendationReason | undefined,
): ItineraryRecommendationReason | undefined => {
  if (!reason) {
    return undefined;
  }

  // Convert factors object to array format
  const factorsArray: Array<{ factor: string; score: number; reasoning: string }> = [];
  if (reason.factors) {
    if (reason.factors.interest !== undefined) {
      factorsArray.push({
        factor: "Interest Match",
        score: reason.factors.interest,
        reasoning: `Interest match score: ${reason.factors.interest}`,
      });
    }
    if (reason.factors.proximity !== undefined) {
      factorsArray.push({
        factor: "Proximity",
        score: reason.factors.proximity,
        reasoning: `Proximity score: ${reason.factors.proximity}`,
      });
    }
    if (reason.factors.budget !== undefined) {
      factorsArray.push({
        factor: "Budget Fit",
        score: reason.factors.budget,
        reasoning: `Budget fit score: ${reason.factors.budget}`,
      });
    }
    if (reason.factors.accessibility !== undefined) {
      factorsArray.push({
        factor: "Accessibility",
        score: reason.factors.accessibility,
        reasoning: `Accessibility score: ${reason.factors.accessibility}`,
      });
    }
    if (reason.factors.time !== undefined) {
      factorsArray.push({
        factor: "Time Fit",
        score: reason.factors.time,
        reasoning: `Time fit score: ${reason.factors.time}`,
      });
    }
    if (reason.factors.weather !== undefined) {
      factorsArray.push({
        factor: "Weather",
        score: reason.factors.weather,
        reasoning: `Weather score: ${reason.factors.weather}`,
      });
    }
    if (reason.factors.groupFit !== undefined) {
      factorsArray.push({
        factor: "Group Fit",
        score: reason.factors.groupFit,
        reasoning: `Group fit score: ${reason.factors.groupFit}`,
      });
    }
  }

  return {
    primaryReason: reason.primaryReason,
    factors: factorsArray.length > 0 ? factorsArray : undefined,
    alternativesConsidered: reason.alternativesConsidered,
  };
};

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
    recommendationReason: convertRecommendationReason(activity.reasoning),
    schedule:
      activity.startTime && activity.endTime
        ? {
            arrivalTime: activity.startTime,
            departureTime: activity.endTime,
          }
        : undefined,
    mealType: activity.mealType === "snack" ? undefined : activity.mealType,
  };
};

const mapTripDayToItineraryDay = (day: TripDay): ItineraryDay => ({
  id: day.id,
  dateLabel: day.date,
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
    const refineSchema = z.object({
      trip: z.any().optional(), // Trip object validation handled separately in refinement engine
      refinementType: z.enum(["more_diverse", "more_focused", "more_adventurous", "more_relaxed", "more_budget_friendly", "more_luxury"]).optional(),
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
      const refinedDay = refineDay({
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

    // Fetch locations from database (with fallback to mock data)
    const allLocations = await fetchAllLocations();
    const trip = convertItineraryToTrip(itinerary, builderData, tripId, allLocations);
    if (!trip.days[dayIndex]) {
      return addRequestContextHeaders(
        badRequest(`Day index ${dayIndex} not found for trip ${tripId}`, undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    const refinedDay = refineDay({ trip, dayIndex, type: refinementType });
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
