import { NextRequest, NextResponse } from "next/server";

import { autocompletePlaces, fetchPlaceCoordinates } from "@/lib/googlePlaces";
import type { AutocompletePlace } from "@/lib/googlePlaces";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { featureFlags } from "@/lib/env/featureFlags";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { locationIdSchema } from "@/lib/api/schemas";

// ── Server-side LRU cache for autocomplete results ──────────────────
const AUTOCOMPLETE_CACHE_MAX = 100;
const AUTOCOMPLETE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

type AutocompleteCacheEntry = {
  places: AutocompletePlace[];
  expiresAt: number;
};

class LruMap<K, V> extends Map<K, V> {
  constructor(private maxSize: number) {
    super();
  }
  override get(key: K): V | undefined {
    const value = super.get(key);
    if (value !== undefined) {
      super.delete(key);
      super.set(key, value);
    }
    return value;
  }
  override set(key: K, value: V): this {
    if (super.has(key)) super.delete(key);
    super.set(key, value);
    while (super.size > this.maxSize) {
      const oldest = super.keys().next().value;
      if (oldest !== undefined) super.delete(oldest);
    }
    return this;
  }
}

const autocompleteCache = new LruMap<string, AutocompleteCacheEntry>(AUTOCOMPLETE_CACHE_MAX);

/** Build a deterministic cache key from the autocomplete request body */
function buildCacheKey(body: Record<string, unknown>): string {
  const { input, languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction } = body;
  return JSON.stringify({ input, languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction });
}

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
    locationRestriction?: {
      rectangle?: {
        low: { latitude: number; longitude: number };
        high: { latitude: number; longitude: number };
      };
    };
  };

  try {
    body = await request.json();
  } catch {
    return addRequestContextHeaders(
      badRequest("Invalid JSON in request body.", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  const { input, languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction } = body;

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return addRequestContextHeaders(
      badRequest("Missing or invalid 'input' field. Must be a non-empty string.", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  // Validate input length
  if (input.trim().length > 500) {
    return addRequestContextHeaders(
      badRequest("Input field too long (max 500 characters).", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  // Validate includedPrimaryTypes if provided
  if (includedPrimaryTypes !== undefined) {
    if (!Array.isArray(includedPrimaryTypes) || includedPrimaryTypes.some((type) => typeof type !== "string")) {
      return addRequestContextHeaders(
        badRequest("'includedPrimaryTypes' must be an array of strings.", undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }
    // Limit array size to prevent DoS
    if (includedPrimaryTypes.length > 50) {
      return addRequestContextHeaders(
        badRequest("'includedPrimaryTypes' array too large (max 50 items).", undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }
  }

  // Validate locationBias if provided
  if (locationBias?.circle) {
    const { center, radius } = locationBias.circle;
    if (
      typeof center?.latitude !== "number" ||
      typeof center?.longitude !== "number" ||
      typeof radius !== "number" ||
      radius < 0 ||
      radius > 50000 // Max radius: 50km
    ) {
      return addRequestContextHeaders(
        badRequest("Invalid 'locationBias.circle'. Must have valid center coordinates and radius between 0 and 50000 meters.", undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }
  }

  // Validate locationRestriction if provided
  if (locationRestriction?.rectangle) {
    const { low, high } = locationRestriction.rectangle;
    if (
      typeof low?.latitude !== "number" ||
      typeof low?.longitude !== "number" ||
      typeof high?.latitude !== "number" ||
      typeof high?.longitude !== "number" ||
      low.latitude < -90 || low.latitude > 90 ||
      high.latitude < -90 || high.latitude > 90 ||
      low.longitude < -180 || low.longitude > 180 ||
      high.longitude < -180 || high.longitude > 180
    ) {
      return addRequestContextHeaders(
        badRequest("Invalid 'locationRestriction.rectangle'. Must have valid low and high coordinates.", undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }
  }

  // Check if Google Places API is enabled
  if (!featureFlags.enableGooglePlaces) {
    return addRequestContextHeaders(
      serviceUnavailable("Google Places API calls are disabled.", {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  try {
    // Check server-side LRU cache first
    const cacheKey = buildCacheKey({ input: input.trim(), languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction });
    const cached = autocompleteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return addRequestContextHeaders(
        NextResponse.json({ places: cached.places }, {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        }),
        finalContext,
      );
    }

    const places = await autocompletePlaces({
      input: input.trim(),
      languageCode,
      regionCode,
      includedPrimaryTypes,
      locationBias,
      locationRestriction,
    });

    // Store in server-side cache
    autocompleteCache.set(cacheKey, {
      places,
      expiresAt: Date.now() + AUTOCOMPLETE_CACHE_TTL,
    });

    return addRequestContextHeaders(
      NextResponse.json({ places }, {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      }),
      finalContext,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to autocomplete places.";
    const errorMessage = error instanceof Error ? error.message : "";

    logger.error("Error autocompleting places", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      input: input.trim(),
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

  // Check if Google Places API is enabled
  if (!featureFlags.enableGooglePlaces) {
    return addRequestContextHeaders(
      serviceUnavailable("Google Places API calls are disabled.", {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  try {
    const place = await fetchPlaceCoordinates(validatedPlaceId);

    if (!place) {
      return addRequestContextHeaders(
        badRequest(`Place not found for placeId: ${validatedPlaceId}`, undefined, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({ place }, {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
        },
      }),
      finalContext,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch place coordinates.";
    const errorMessage = error instanceof Error ? error.message : "";

    logger.error("Error fetching place coordinates", error instanceof Error ? error : new Error(String(error)), {
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

