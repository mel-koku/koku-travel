import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability/availabilityService";
import { findLocationsForActivities } from "@/lib/itineraryLocations";
import type { ItineraryActivity } from "@/types/itinerary";
import { badRequest } from "@/lib/api/errors";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { validateRequestBody, availabilityRequestSchema } from "@/lib/api/schemas";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * POST /api/itinerary/availability
 * Check availability for one or more itinerary activities
 */
export const POST = withApiHandler(
  async (request) => {
    const validation = await validateRequestBody(request, availabilityRequestSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", { errors: validation.error.issues });
    }
    const { activities } = validation.data as { activities: ItineraryActivity[] };

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
            error: getErrorMessage(error),
          });
          return {
            activityId: activity.id,
            status: "unknown" as const,
            message: "Failed to check availability",
          };
        }
      }),
    );

    return NextResponse.json({ results: availabilityResults });
  },
  { rateLimit: RATE_LIMITS.ITINERARY_AVAILABILITY, requireJson: true },
);

