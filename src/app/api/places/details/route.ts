import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceCoordinates } from "@/lib/googlePlaces";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { locationIdSchema } from "@/lib/api/schemas";
import type { Location } from "@/types/location";

/**
 * GET /api/places/details?placeId=...&name=...
 * Fetch place details by Google Place ID and return as Location object.
 * 
 * Note: This endpoint is public but rate-limited. Authentication is optional
 * and may be used for user-specific features in the future.
 * 
 * @param request - Next.js request object
 * @param request.url - Must contain query parameter 'placeId', optional 'name'
 * @returns JSON object with Location details
 * @throws Returns 400 if placeId is missing or invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Optional authentication (for future user-specific features)
  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const name = searchParams.get("name");

  // Validate placeId parameter
  if (!placeId || placeId.trim().length === 0) {
    return addRequestContextHeaders(
      badRequest("Missing required query parameter 'placeId'.", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  // Validate placeId format using schema
  const placeIdValidation = locationIdSchema.safeParse(placeId.trim());
  if (!placeIdValidation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid placeId format.", {
        errors: placeIdValidation.error.issues,
      }, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  const validatedPlaceId = placeIdValidation.data;

  // Validate name parameter if provided
  if (name && name.length > 500) {
    return addRequestContextHeaders(
      badRequest("Name parameter too long (max 500 characters).", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  try {
    // Fetch place coordinates and basic info
    const place = await fetchPlaceCoordinates(validatedPlaceId);

    if (!place) {
      return addRequestContextHeaders(
        badRequest(`Place not found for placeId: ${validatedPlaceId}`, undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    // Create Location object from place data
    const location: Location = {
      id: validatedPlaceId,
      name: name || place.displayName || "",
      region: place.formattedAddress?.split(",").pop()?.trim() || "",
      city: place.formattedAddress?.split(",")[0]?.trim() || "",
      category: "point_of_interest",
      image: "",
      coordinates: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      placeId: place.placeId,
    };

    return addRequestContextHeaders(
      NextResponse.json({ location }, {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
        },
      }),
      finalContext,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch place details.";
    const errorMessage = error instanceof Error ? error.message : "";

    logger.error("Error fetching place details", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      placeId: validatedPlaceId,
    });

    if (errorMessage.includes("Missing Google Places API key")) {
      return addRequestContextHeaders(
        serviceUnavailable("Google Places API is not configured.", {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}

