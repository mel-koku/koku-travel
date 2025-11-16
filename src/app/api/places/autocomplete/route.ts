import { NextRequest } from "next/server";

import { autocompletePlaces, fetchPlaceCoordinates } from "@/lib/googlePlaces";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";

/**
 * POST /api/places/autocomplete
 * Autocomplete places using Google Places API.
 *
 * @param request - Next.js request object
 * @param request.body.input - Search input text (required)
 * @param request.body.languageCode - Language code (optional, default: "en")
 * @param request.body.regionCode - Region code (optional, default: "JP")
 * @param request.body.includedPrimaryTypes - Array of place types to filter (optional)
 * @param request.body.locationBias - Location bias for results (optional)
 * @returns JSON array of autocomplete suggestions
 * @throws Returns 400 if input is missing or invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: {
    input?: string;
    languageCode?: string;
    regionCode?: string;
    includedPrimaryTypes?: string[];
    locationBias?: {
      circle?: {
        center: { latitude: number; longitude: number };
        radius: number;
      };
    };
  };

  try {
    body = await request.json();
  } catch (error) {
    return badRequest("Invalid JSON in request body.");
  }

  const { input, languageCode, regionCode, includedPrimaryTypes, locationBias } = body;

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return badRequest("Missing or invalid 'input' field. Must be a non-empty string.");
  }

  // Validate includedPrimaryTypes if provided
  if (includedPrimaryTypes !== undefined) {
    if (!Array.isArray(includedPrimaryTypes) || includedPrimaryTypes.some((type) => typeof type !== "string")) {
      return badRequest("'includedPrimaryTypes' must be an array of strings.");
    }
  }

  // Validate locationBias if provided
  if (locationBias?.circle) {
    const { center, radius } = locationBias.circle;
    if (
      typeof center?.latitude !== "number" ||
      typeof center?.longitude !== "number" ||
      typeof radius !== "number" ||
      radius < 0
    ) {
      return badRequest("Invalid 'locationBias.circle'. Must have valid center coordinates and non-negative radius.");
    }
  }

  try {
    const places = await autocompletePlaces({
      input: input.trim(),
      languageCode,
      regionCode,
      includedPrimaryTypes,
      locationBias,
    });

    return Response.json({ places }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to autocomplete places.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return serviceUnavailable("Google Places API is not configured.");
    }

    return internalError(message);
  }
}

/**
 * GET /api/places/autocomplete?placeId=...
 * Fetch coordinates for a specific place by place ID.
 *
 * @param request - Next.js request object
 * @param request.url - Must contain query parameter 'placeId'
 * @returns JSON object with place details including coordinates
 * @throws Returns 400 if placeId is missing or invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId || placeId.trim().length === 0) {
    return badRequest("Missing required query parameter 'placeId'.");
  }

  try {
    const place = await fetchPlaceCoordinates(placeId.trim());

    if (!place) {
      return badRequest(`Place not found for placeId: ${placeId}`);
    }

    return Response.json({ place }, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch place coordinates.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return serviceUnavailable("Google Places API is not configured.");
    }

    return internalError(message);
  }
}

