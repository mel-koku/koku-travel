import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability/availabilityService";
import { findLocationsForActivities } from "@/lib/itineraryLocations";
import type { ItineraryActivity } from "@/types/itinerary";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createRequestContext, addRequestContextHeaders, requireJsonContentType } from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

/**
 * POST /api/itinerary/availability
 * Check availability for one or more itinerary activities
 */
export async function POST(request: NextRequest) {
  const context = createRequestContext(request);

  // Apply rate limiting: 60 requests per minute
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return addRequestContextHeaders(rateLimitResponse, context);

  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

  try {
    const body = await request.json();
    const { activities } = body as { activities: ItineraryActivity[] };

    if (!Array.isArray(activities)) {
      return badRequest("Activities must be an array");
    }

    // Filter to place activities only
    const placeActivities = activities.filter(
      (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
    );

    // Batch fetch all locations at once
    const locationsMap = await findLocationsForActivities(placeActivities);

    // Check availability for each activity
    const availabilityResults = await Promise.all(
      activities.map(async (activity) => {
        if (activity.kind !== "place") {
          return {
            activityId: activity.id,
            status: "unknown" as const,
            message: "Not a place activity",
          };
        }

        const location = locationsMap.get(activity.id);
        if (!location) {
          return {
            activityId: activity.id,
            status: "unknown" as const,
            message: "Location not found",
          };
        }

        try {
          const availability = await checkAvailability(location);
          return {
            activityId: activity.id,
            status: availability.status,
            message: availability.message,
            reservationRequired: availability.reservationRequired,
            busyLevel: availability.busyLevel,
          };
        } catch (error) {
          logger.warn("Failed to check availability", {
            activityId: activity.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            activityId: activity.id,
            status: "unknown" as const,
            message: "Failed to check availability",
          };
        }
      }),
    );

    return addRequestContextHeaders(
      NextResponse.json({ results: availabilityResults }),
      context,
    );
  } catch (error) {
    logger.error("Error checking availability", error instanceof Error ? error : new Error(String(error)));
    return addRequestContextHeaders(internalError("Failed to check availability"), context);
  }
}

