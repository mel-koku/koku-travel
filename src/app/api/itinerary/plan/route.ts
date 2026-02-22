import { NextRequest, NextResponse } from "next/server";
import { generateTripFromBuilderData, validateTripConstraints } from "@/lib/server/itineraryEngine";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import { validateItinerary } from "@/lib/validation/itineraryValidator";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { validateRequestBody, planRequestSchema } from "@/lib/api/schemas";
import { badRequest, internalError, gatewayTimeout } from "@/lib/api/errors";
import { getCachedItinerary, cacheItinerary } from "@/lib/cache/itineraryCache";
import { getErrorMessage } from "@/lib/utils/errorUtils";

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
 *   itinerary: Itinerary,
 *   validation: { valid: boolean, issues: string[] },
 *   itineraryValidation: {
 *     valid: boolean,
 *     issues: ValidationIssue[],
 *     summary: { errorCount, warningCount, duplicateLocations, ... }
 *   }
 * }
 *
 * Validation checks:
 * - Duplicate locations (error)
 * - Minimum 2 activities per day (warning)
 * - Category diversity (warning if >50% same category)
 * - Neighborhood clustering (warning if >3 consecutive same area)
 *
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 100 requests per minute per IP (increased for development)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

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

  const { builderData, tripId, savedIds } = validation.data;

  try {
    // Check cache first (before expensive generation)
    // Skip cache when user has saved places or content context — these are personalized
    const hasPersonalization = (savedIds && savedIds.length > 0) || builderData.contentContext;
    const cachedResult = !hasPersonalization
      ? await getCachedItinerary(builderData)
      : null;
    if (cachedResult) {
      logger.info("Returning cached itinerary", {
        requestId: finalContext.requestId,
      });

      // Validate cached itinerary
      const itineraryValidation = validateItinerary(cachedResult.itinerary);
      const tripValidation = validateTripConstraints(cachedResult.trip);

      return addRequestContextHeaders(
        NextResponse.json({
          trip: cachedResult.trip,
          itinerary: cachedResult.itinerary,
          dayIntros: cachedResult.dayIntros,
          validation: tripValidation,
          itineraryValidation: {
            valid: itineraryValidation.valid,
            issues: itineraryValidation.issues,
            summary: itineraryValidation.summary,
          },
        }, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Cache": "HIT",
          },
        }),
        finalContext,
      );
    }

    // Generate trip ID if not provided
    const finalTripId = tripId ?? `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Ensure travelerProfile is built
    if (!builderData.travelerProfile) {
      builderData.travelerProfile = buildTravelerProfile(builderData);
    }

    // Generate trip (returns both domain model and raw itinerary)
    // Include savedIds if provided (user's saved locations from Places page)
    // 25s timeout prevents hanging upstream from blocking indefinitely
    const GENERATION_TIMEOUT_MS = 25_000;
    const timeoutSentinel = Symbol("timeout");
    const generationResult = await Promise.race([
      generateTripFromBuilderData(builderData, finalTripId, savedIds),
      new Promise<typeof timeoutSentinel>((resolve) =>
        setTimeout(() => resolve(timeoutSentinel), GENERATION_TIMEOUT_MS),
      ),
    ]);

    if (generationResult === timeoutSentinel) {
      logger.error("Itinerary generation timed out", undefined, {
        requestId: finalContext.requestId,
        timeoutMs: GENERATION_TIMEOUT_MS,
      });
      return addRequestContextHeaders(
        gatewayTimeout(
          "Itinerary generation timed out. Try again or simplify your trip.",
          { requestId: finalContext.requestId },
        ),
        finalContext,
      );
    }

    const { trip, itinerary, dayIntros } = generationResult;

    // Cache the generated itinerary for future requests
    await cacheItinerary(builderData, trip, itinerary, dayIntros);

    // Validate trip constraints (domain-level validation)
    const tripValidation = validateTripConstraints(trip);

    // Validate itinerary quality (post-generation validation)
    const itineraryValidation = validateItinerary(itinerary);

    // Log any validation issues for monitoring
    if (!itineraryValidation.valid || itineraryValidation.issues.length > 0) {
      logger.warn("Itinerary validation issues detected", {
        requestId: finalContext.requestId,
        valid: itineraryValidation.valid,
        errorCount: itineraryValidation.summary.errorCount,
        warningCount: itineraryValidation.summary.warningCount,
        duplicateLocations: itineraryValidation.summary.duplicateLocations,
      });
    }

    return addRequestContextHeaders(
      NextResponse.json({
        trip,
        itinerary,
        dayIntros,
        validation: tripValidation,
        itineraryValidation: {
          valid: itineraryValidation.valid,
          issues: itineraryValidation.issues,
          summary: itineraryValidation.summary,
        },
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Cache": "MISS",
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
        { message: getErrorMessage(error) },
        { requestId: finalContext.requestId },
      ),
      finalContext,
    );
  }
}

