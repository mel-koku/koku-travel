import { NextRequest, NextResponse } from "next/server";
import { generateTripFromBuilderData, validateTripConstraints } from "@/lib/server/itineraryEngine";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
} from "@/lib/api/middleware";
import { validateRequestBody, planRequestSchema } from "@/lib/api/schemas";
import { badRequest, internalError } from "@/lib/api/errors";

/**
 * POST /api/itinerary/plan
 * 
 * Generates an itinerary from TripBuilderData and returns a Trip domain model.
 * 
 * Request body:
 * {
 *   builderData: TripBuilderData,
 *   tripId?: string (optional, will be generated if not provided)
 * }
 * 
 * Response:
 * {
 *   trip: Trip,
 *   validation: { valid: boolean, issues: string[] }
 * }
 * 
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 20 requests per minute per IP (itinerary generation is expensive)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Optional authentication (for future user-specific features)
  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  // Validate request body with size limit (1MB)
  const validation = await validateRequestBody(request, planRequestSchema, 1024 * 1024);
  if (!validation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid request body", {
        errors: validation.error.issues,
      }, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  const { builderData, tripId } = validation.data;

  try {
    // Generate trip ID if not provided
    const finalTripId = tripId ?? `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Ensure travelerProfile is built
    if (!builderData.travelerProfile) {
      builderData.travelerProfile = buildTravelerProfile(builderData);
    }

    // Generate trip (returns both domain model and raw itinerary)
    const { trip, itinerary } = await generateTripFromBuilderData(builderData, finalTripId);

    // Validate constraints
    const tripValidation = validateTripConstraints(trip);

    return addRequestContextHeaders(
      NextResponse.json({
        trip,
        itinerary,
        validation: tripValidation,
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }),
      finalContext,
    );
  } catch (error) {
    logger.error("Failed to generate itinerary", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
    });
    return addRequestContextHeaders(
      internalError(
        "Failed to generate itinerary",
        { message: error instanceof Error ? error.message : String(error) },
        { requestId: finalContext.requestId },
      ),
      finalContext,
    );
  }
}

