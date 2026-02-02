import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { planItinerary } from "@/lib/itineraryPlanner";
import type { Itinerary } from "@/types/itinerary";

/**
 * Request body for scheduling an itinerary
 */
interface ScheduleItineraryRequest {
  itinerary: Itinerary;
  options?: {
    defaultDayStart?: string;
    defaultDayEnd?: string;
    defaultVisitMinutes?: number;
    transitionBufferMinutes?: number;
  };
  dayEntryPoints?: Record<
    string,
    {
      startPoint?: { coordinates: { lat: number; lng: number } };
      endPoint?: { coordinates: { lat: number; lng: number } };
    }
  >;
}

/**
 * POST /api/itinerary/schedule
 * Schedules an existing itinerary with travel times and operating windows.
 *
 * This is different from /api/itinerary/plan which generates a new trip.
 * This endpoint takes an existing itinerary and calculates:
 * - Travel times between activities
 * - Arrival/departure times
 * - Operating window adjustments
 *
 * @param request - Next.js request object
 * @returns Scheduled itinerary with times, or error response
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 100 requests per minute per IP (increased for development)
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  try {
    const body = (await request.json()) as ScheduleItineraryRequest;

    const { itinerary, options, dayEntryPoints } = body;

    // Validate required fields
    if (!itinerary || !itinerary.days) {
      return addRequestContextHeaders(
        badRequest("Invalid or missing itinerary", undefined, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    // Schedule the itinerary
    const scheduled = await planItinerary(itinerary, options, dayEntryPoints);

    return addRequestContextHeaders(
      NextResponse.json(
        { data: scheduled },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-cache",
          },
        },
      ),
      context,
    );
  } catch (error) {
    logger.error(
      "Unexpected error scheduling itinerary",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId },
    );
    const message =
      error instanceof Error ? error.message : "Failed to schedule itinerary.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}
