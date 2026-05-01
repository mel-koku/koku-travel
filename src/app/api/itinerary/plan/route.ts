import { NextRequest, NextResponse } from "next/server";
import { generateTripFromBuilderData, validateTripConstraints } from "@/lib/server/itineraryEngine";
import { isFullAccessEnabled } from "@/lib/billing/accessServer";
import { redactItineraryForLockedDays } from "@/lib/billing/redactItinerary";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import { validateItinerary } from "@/lib/validation/itineraryValidator";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { RATE_LIMITS, DAILY_QUOTAS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { validateRequestBody, planRequestSchema } from "@/lib/api/schemas";
import { badRequest, internalError, gatewayTimeout } from "@/lib/api/errors";
import { getCachedItinerary, cacheItinerary } from "@/lib/cache/itineraryCache";
import { gateOnDailyCost } from "@/lib/api/costGate";
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
// Allow up to 60s for itinerary generation on Vercel
export const maxDuration = 60;

export const POST = withApiHandler(async (request: NextRequest, { context, user }) => {
  // Stricter rate limit for unauthenticated requests (4 req/min vs 20)
  if (!user) {
    const unauthRateLimitResponse = await checkRateLimit(request, RATE_LIMITS.ITINERARY_PLAN_UNAUTH);
    if (unauthRateLimitResponse) {
      return unauthRateLimitResponse;
    }
  }

  // Validate request body with size limit (1MB)
  const validation = await validateRequestBody(request, planRequestSchema, 1024 * 1024);
  if (!validation.success) {
    return badRequest("Invalid request body", {
      errors: validation.error.issues,
    }, {
      requestId: context.requestId,
    });
  }

  const { builderData, tripId, savedIds } = validation.data;

  try {
    // Check cache first (before expensive generation)
    // Skip cache when user has saved places or content context — these are personalized
    const hasPersonalization = (savedIds && savedIds.length > 0) || builderData.contentContext || !!builderData.accessibility?.notes?.trim() || !!builderData.accessibility?.dietaryOther?.trim();
    const cachedResult = !hasPersonalization
      ? await getCachedItinerary(builderData)
      : null;
    if (cachedResult) {
      logger.info("Returning cached itinerary", {
        requestId: context.requestId,
      });

      // Validate cached itinerary (validation runs against unredacted data —
      // the cache + DB always store the full trip; redaction only shapes the
      // response to non-authorized callers).
      const itineraryValidation = validateItinerary(cachedResult.itinerary, {
        vibeCount: builderData.vibes?.length,
      });
      const tripValidation = validateTripConstraints(cachedResult.trip);

      const cacheFullAccess = await isFullAccessEnabled(user?.id);
      const cacheResponse = user
        ? {
            trip: cachedResult.trip,
            itinerary: cachedResult.itinerary,
            dayIntros: cachedResult.dayIntros,
            guideProse: cachedResult.guideProse,
            dailyBriefings: cachedResult.dailyBriefings,
          }
        : redactItineraryForLockedDays({
            itinerary: cachedResult.itinerary,
            trip: cachedResult.trip,
            dayIntros: cachedResult.dayIntros,
            guideProse: cachedResult.guideProse,
            dailyBriefings: cachedResult.dailyBriefings,
          });

      return NextResponse.json({
        trip: cacheResponse.trip,
        itinerary: cacheResponse.itinerary,
        dayIntros: cacheResponse.dayIntros,
        guideProse: cacheResponse.guideProse,
        dailyBriefings: cacheResponse.dailyBriefings,
        culturalBriefing: cachedResult.culturalBriefing,
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
          "X-Full-Access": cacheFullAccess ? "1" : "0",
        },
      });
    }

    // Cache missed — gate Vertex spend before generation. Pessimistic estimate
    // (see costGate.ts COST_ESTIMATES.itineraryPlan); real calls are cheaper.
    const costDenial = await gateOnDailyCost({
      costKey: user?.id ?? context.ip ?? "unknown",
      estimate: "itineraryPlan",
      routeName: "/api/itinerary/plan",
      requestId: context.requestId,
    });
    if (costDenial) return costDenial;

    // Generate trip ID if not provided
    const finalTripId = tripId ?? `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Ensure travelerProfile is built
    if (!builderData.travelerProfile) {
      builderData.travelerProfile = buildTravelerProfile(builderData);
    }

    // Check if full access is enabled (free window or env override)
    const fullAccess = await isFullAccessEnabled(user?.id);

    // Generate trip (returns both domain model and raw itinerary)
    // Include savedIds if provided (user's saved locations from Places page)
    // 55s timeout — under Vercel's 60s limit. Pipeline is:
    //   locations (~1-2s) + weather (parallel, ~4s) + scoring (~2s) +
    //   routing+gemini (parallel, ~8-12s) = ~15-20s typical, 40s worst case
    const GENERATION_TIMEOUT_MS = 55_000;
    const timeoutSentinel = Symbol("timeout");
    const startMs = Date.now();
    const generationResult = await Promise.race([
      generateTripFromBuilderData(builderData, finalTripId, savedIds, {
        deferProse: !fullAccess,
      }),
      new Promise<typeof timeoutSentinel>((resolve) =>
        setTimeout(() => resolve(timeoutSentinel), GENERATION_TIMEOUT_MS),
      ),
    ]);
    const elapsedMs = Date.now() - startMs;

    if (generationResult === timeoutSentinel) {
      logger.error("Itinerary generation timed out", undefined, {
        requestId: context.requestId,
        timeoutMs: GENERATION_TIMEOUT_MS,
        elapsedMs,
      });
      return gatewayTimeout(
        "Itinerary generation timed out. Try again or simplify your trip.",
        { requestId: context.requestId },
      );
    }

    logger.info("Itinerary generation completed", {
      requestId: context.requestId,
      elapsedMs,
    });

    const { trip, itinerary, dayIntros, guideProse, dailyBriefings, culturalBriefing } = generationResult;

    // Cache the generated itinerary for future requests — but ONLY when
    // the result wasn't personalized. Without this gate, caching a
    // savedIds-injected trip under the bare-builderData key would leak
    // user A's favorites into user B's response next time B (or anyone)
    // asks with the same builderData and no personalization.
    if (!hasPersonalization) {
      await cacheItinerary(builderData, trip, itinerary, dayIntros, guideProse, dailyBriefings, culturalBriefing);
    }

    // Validate trip constraints (domain-level validation)
    const tripValidation = validateTripConstraints(trip);

    // Validate itinerary quality (post-generation validation).
    // Pass vibeCount so themed trips (1–2 vibes) get a relaxed category
    // diversity threshold — users who pick history_buff expect history.
    const itineraryValidation = validateItinerary(itinerary, {
      vibeCount: builderData.vibes?.length,
    });

    // Log any validation issues for monitoring
    if (!itineraryValidation.valid || itineraryValidation.issues.length > 0) {
      logger.warn("Itinerary validation issues detected", {
        requestId: context.requestId,
        valid: itineraryValidation.valid,
        errorCount: itineraryValidation.summary.errorCount,
        warningCount: itineraryValidation.summary.warningCount,
        duplicateLocations: itineraryValidation.summary.duplicateLocations,
      });
    }

    // Redact Day 2-N for guests so the response itself doesn't leak the
    // full plan. Logged-in users see the full preview as before; the UI
    // gate / billing flow handles their unlock state.
    const freshResponse = user
      ? { trip, itinerary, dayIntros, guideProse, dailyBriefings }
      : redactItineraryForLockedDays({
          itinerary,
          trip,
          dayIntros,
          guideProse,
          dailyBriefings,
        });

    return NextResponse.json({
      trip: freshResponse.trip,
      itinerary: freshResponse.itinerary,
      dayIntros: freshResponse.dayIntros,
      guideProse: freshResponse.guideProse,
      dailyBriefings: freshResponse.dailyBriefings,
      culturalBriefing,
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
        "X-Full-Access": fullAccess ? "1" : "0",
      },
    });
  } catch (error) {
    logger.error("Failed to generate itinerary", error instanceof Error ? error : new Error(String(error)), {
      requestId: context.requestId,
    });
    return internalError(
      "Failed to generate itinerary",
      { message: getErrorMessage(error) },
      { requestId: context.requestId },
    );
  }
}, { rateLimit: RATE_LIMITS.ITINERARY_PLAN, dailyQuota: DAILY_QUOTAS.ITINERARY_PLAN, optionalAuth: true, requireJson: true });

