import { NextResponse } from "next/server";
import { fetchPlaceDetailsByPlaceId } from "@/lib/googlePlaces";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS, DAILY_QUOTAS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";
import { locationIdSchema } from "@/lib/api/schemas";
import { featureFlags } from "@/lib/env/featureFlags";

/**
 * GET /api/places/details?placeId=...&name=...
 * Fetch place details by Google Place ID and return as Location object.
 */
export const GET = withApiHandler(
  async (request, { context }) => {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const name = searchParams.get("name");

    if (!placeId || placeId.trim().length === 0) {
      return badRequest("Missing required query parameter 'placeId'.", undefined, {
        requestId: context.requestId,
      });
    }

    const placeIdValidation = locationIdSchema.safeParse(placeId.trim());
    if (!placeIdValidation.success) {
      return badRequest("Invalid placeId format.", {
        errors: placeIdValidation.error.issues,
      }, {
        requestId: context.requestId,
      });
    }

    const validatedPlaceId = placeIdValidation.data;

    if (name && name.length > 500) {
      return badRequest("Name parameter too long (max 500 characters).", undefined, {
        requestId: context.requestId,
      });
    }

    if (!featureFlags.enableGooglePlaces || featureFlags.cheapMode) {
      return serviceUnavailable(
        "Google Places API calls are disabled.",
        { requestId: context.requestId },
      );
    }

    try {
      const result = await fetchPlaceDetailsByPlaceId(validatedPlaceId, name ?? undefined);

      if (!result) {
        return badRequest(`Place not found for placeId: ${validatedPlaceId}`, undefined, {
          requestId: context.requestId,
        });
      }

      return NextResponse.json({
        location: result.location,
        details: result.details,
        meta: { requestId: context.requestId },
      }, {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      logger.error("Error fetching place details", error instanceof Error ? error : new Error(String(error)), {
        requestId: context.requestId,
        placeId: validatedPlaceId,
      });

      if (errorMessage.includes("Missing Google Places API key")) {
        return serviceUnavailable("Google Places API is not configured.", {
          requestId: context.requestId,
        });
      }

      return internalError("Failed to fetch place details", undefined, {
        requestId: context.requestId,
      });
    }
  },
  { rateLimit: RATE_LIMITS.PLACES, dailyQuota: DAILY_QUOTAS.PLACES, optionalAuth: true },
);
