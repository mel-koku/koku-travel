import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { validateRequestBody } from "@/lib/api/schemas";
import { z } from "zod";
import { planItinerary } from "@/lib/itineraryPlanner";

const scheduleRequestSchema = z.object({
  itinerary: z.object({
    days: z.array(z.unknown()).min(1),
  }).passthrough(),
  options: z.object({
    defaultDayStart: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).optional(),
    defaultDayEnd: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).optional(),
    defaultVisitMinutes: z.number().int().min(5).max(480).optional(),
    transitionBufferMinutes: z.number().int().min(0).max(120).optional(),
  }).strict().optional(),
  dayEntryPoints: z.record(
    z.string(),
    z.object({
      startPoint: z.object({ coordinates: z.object({ lat: z.number(), lng: z.number() }) }).optional(),
      endPoint: z.object({ coordinates: z.object({ lat: z.number(), lng: z.number() }) }).optional(),
    }),
  ).optional(),
});

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

  const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.ITINERARY_SCHEDULE);
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

  try {
    const validation = await validateRequestBody(request, scheduleRequestSchema);
    if (!validation.success) {
      return addRequestContextHeaders(
        badRequest("Invalid request body", validation.error, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    const { itinerary, options, dayEntryPoints } = validation.data;

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
