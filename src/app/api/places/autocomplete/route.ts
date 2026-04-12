import { NextRequest, NextResponse } from "next/server";

import { autocompletePlaces, fetchPlaceCoordinates } from "@/lib/googlePlaces";
import type { AutocompletePlace } from "@/lib/googlePlaces";
import { badRequest, serviceUnavailable } from "@/lib/api/errors";
import { featureFlags } from "@/lib/env/featureFlags";
import { checkBodySizeLimit } from "@/lib/api/bodySizeLimit";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS, DAILY_QUOTAS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";
import { locationIdSchema } from "@/lib/api/schemas";

const AUTOCOMPLETE_MAX_BODY_SIZE = 16 * 1024; // 16KB

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

function buildCacheKey(body: Record<string, unknown>): string {
  const { input, languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction } = body;
  return JSON.stringify({ input, languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction });
}

/**
 * POST /api/places/autocomplete
 * Autocomplete places using Google Places API.
 */
export const POST = withApiHandler(
  async (request: NextRequest, { context }) => {
    // Body size check (custom, not handled by wrapper)
    const bodySizeResult = await checkBodySizeLimit(request, AUTOCOMPLETE_MAX_BODY_SIZE);
    if (bodySizeResult) return bodySizeResult;

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
      return badRequest("Invalid JSON in request body.", undefined, {
        requestId: context.requestId,
      });
    }

    const { input, languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return badRequest("Missing or invalid 'input' field. Must be a non-empty string.", undefined, {
        requestId: context.requestId,
      });
    }

    if (input.trim().length > 500) {
      return badRequest("Input field too long (max 500 characters).", undefined, {
        requestId: context.requestId,
      });
    }

    if (includedPrimaryTypes !== undefined) {
      if (!Array.isArray(includedPrimaryTypes) || includedPrimaryTypes.some((type) => typeof type !== "string")) {
        return badRequest("'includedPrimaryTypes' must be an array of strings.", undefined, {
          requestId: context.requestId,
        });
      }
      if (includedPrimaryTypes.length > 50) {
        return badRequest("'includedPrimaryTypes' array too large (max 50 items).", undefined, {
          requestId: context.requestId,
        });
      }
    }

    if (locationBias?.circle) {
      const { center, radius } = locationBias.circle;
      if (
        typeof center?.latitude !== "number" ||
        typeof center?.longitude !== "number" ||
        typeof radius !== "number" ||
        radius < 0 ||
        radius > 50000
      ) {
        return badRequest("Invalid 'locationBias.circle'. Must have valid center coordinates and radius between 0 and 50000 meters.", undefined, {
          requestId: context.requestId,
        });
      }
    }

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
        return badRequest("Invalid 'locationRestriction.rectangle'. Must have valid low and high coordinates.", undefined, {
          requestId: context.requestId,
        });
      }
    }

    if (!featureFlags.enableGooglePlaces) {
      return serviceUnavailable("Google Places API calls are disabled.", {
        requestId: context.requestId,
      });
    }

    const cacheKey = buildCacheKey({ input: input.trim(), languageCode, regionCode, includedPrimaryTypes, locationBias, locationRestriction });
    const cached = autocompleteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ places: cached.places }, {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
      });
    }

    try {
      const places = await autocompletePlaces({
        input: input.trim(),
        languageCode,
        regionCode,
        includedPrimaryTypes,
        locationBias,
        locationRestriction,
      });

      autocompleteCache.set(cacheKey, {
        places,
        expiresAt: Date.now() + AUTOCOMPLETE_CACHE_TTL,
      });

      return NextResponse.json({ places }, {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      logger.error("Error autocompleting places", error instanceof Error ? error : new Error(String(error)), {
        requestId: context.requestId,
        input: input.trim(),
      });

      if (errorMessage.includes("Missing Google Places API key")) {
        return serviceUnavailable("Google Places API is not configured.", {
          requestId: context.requestId,
        });
      }

      throw error;
    }
  },
  { rateLimit: RATE_LIMITS.PLACES, dailyQuota: DAILY_QUOTAS.PLACES, optionalAuth: true },
);

/**
 * GET /api/places/autocomplete?placeId=...
 * Fetch coordinates for a specific place by place ID.
 */
export const GET = withApiHandler(
  async (request, { context }) => {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");

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

    if (!featureFlags.enableGooglePlaces) {
      return serviceUnavailable("Google Places API calls are disabled.", {
        requestId: context.requestId,
      });
    }

    try {
      const place = await fetchPlaceCoordinates(validatedPlaceId);

      if (!place) {
        return badRequest(`Place not found for placeId: ${validatedPlaceId}`, undefined, {
          requestId: context.requestId,
        });
      }

      return NextResponse.json({ place }, {
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      logger.error("Error fetching place coordinates", error instanceof Error ? error : new Error(String(error)), {
        requestId: context.requestId,
        placeId: validatedPlaceId,
      });

      if (errorMessage.includes("Missing Google Places API key")) {
        return serviceUnavailable("Google Places API is not configured.", {
          requestId: context.requestId,
        });
      }

      throw error;
    }
  },
  { rateLimit: RATE_LIMITS.PLACES, dailyQuota: DAILY_QUOTAS.PLACES, optionalAuth: true },
);
