import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { validateRequestBody } from "@/lib/api/schemas";
import { z } from "zod";
import { findReplacementCandidates } from "@/lib/activityReplacement";

const replacementsRequestSchema = z.object({
  activity: z.object({
    kind: z.literal("place"),
  }).passthrough(),
  tripData: z.object({}).passthrough(),
  allActivities: z.array(z.unknown()).max(500),
  dayActivities: z.array(z.unknown()).max(100),
  currentDayIndex: z.number().int().min(0).max(30),
  maxCandidates: z.number().int().min(1).max(50).optional(),
});

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

  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

  try {
    const validation = await validateRequestBody(request, replacementsRequestSchema);
    if (!validation.success) {
      return addRequestContextHeaders(
        badRequest("Invalid request body", validation.error, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    const {
      activity,
      tripData,
      allActivities,
      dayActivities,
      currentDayIndex,
      maxCandidates = 10,
    } = validation.data as z.infer<typeof replacementsRequestSchema> & {
      activity: Parameters<typeof findReplacementCandidates>[0];
      tripData: Parameters<typeof findReplacementCandidates>[1];
      allActivities: Parameters<typeof findReplacementCandidates>[2];
      dayActivities: Parameters<typeof findReplacementCandidates>[3];
    };

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
