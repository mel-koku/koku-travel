import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/errors";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
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
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export const POST = withApiHandler(
  async (request, { context }) => {
    const validation = await validateRequestBody(request, scheduleRequestSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", validation.error, {
        requestId: context.requestId,
      });
    }

    const { itinerary, options, dayEntryPoints } = validation.data;

    // Schedule the itinerary
    const scheduled = await planItinerary(itinerary, options, dayEntryPoints);

    return NextResponse.json(
      { data: scheduled },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache",
        },
      },
    );
  },
  { rateLimit: RATE_LIMITS.ITINERARY_SCHEDULE, requireJson: true },
);
