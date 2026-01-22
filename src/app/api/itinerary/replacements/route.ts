import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { findReplacementCandidates } from "@/lib/activityReplacement";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

/**
 * Request body for finding replacement candidates
 */
interface FindReplacementsRequest {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  tripData: TripBuilderData;
  allActivities: ItineraryActivity[];
  dayActivities: ItineraryActivity[];
  currentDayIndex: number;
  maxCandidates?: number;
}

/**
 * POST /api/itinerary/replacements
 * Finds replacement candidates for an activity.
 *
 * @param request - Next.js request object
 * @returns Array of ReplacementCandidate objects, or error response
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  try {
    const body = (await request.json()) as FindReplacementsRequest;

    const {
      activity,
      tripData,
      allActivities,
      dayActivities,
      currentDayIndex,
      maxCandidates = 10,
    } = body;

    // Validate required fields
    if (!activity || activity.kind !== "place") {
      return addRequestContextHeaders(
        badRequest("Invalid or missing activity", undefined, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    if (!tripData) {
      return addRequestContextHeaders(
        badRequest("Missing tripData", undefined, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    if (!Array.isArray(allActivities) || !Array.isArray(dayActivities)) {
      return addRequestContextHeaders(
        badRequest("allActivities and dayActivities must be arrays", undefined, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    // Find replacement candidates
    const result = await findReplacementCandidates(
      activity,
      tripData,
      allActivities,
      dayActivities,
      currentDayIndex,
      maxCandidates,
    );

    return addRequestContextHeaders(
      NextResponse.json(
        { data: result },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=60",
          },
        },
      ),
      context,
    );
  } catch (error) {
    logger.error(
      "Unexpected error finding replacement candidates",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId },
    );
    const message =
      error instanceof Error ? error.message : "Failed to find replacement candidates.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}
