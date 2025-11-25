import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability/availabilityService";
import { findLocationForActivity } from "@/lib/itineraryLocations";
import type { ItineraryActivity } from "@/types/itinerary";
import { badRequest, internalError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/itinerary/availability
 * Check availability for one or more itinerary activities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activities } = body as { activities: ItineraryActivity[] };

    if (!Array.isArray(activities)) {
      return badRequest("Activities must be an array");
    }

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

        const location = findLocationForActivity(activity);
        if (!location) {
          return {
            activityId: activity.id,
            status: "unknown" as const,
            message: "Location not found",
          };
        }

        try {
          const availability = await checkAvailability(location, { useCache: true });
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

    return NextResponse.json({ results: availabilityResults });
  } catch (error) {
    logger.error("Error checking availability", error instanceof Error ? error : new Error(String(error)));
    return internalError("Failed to check availability");
  }
}

