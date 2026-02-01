import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { createApiResponse } from "@/lib/api/pagination";

export type CityOption = {
  id: string;
  name: string;
  region: string;
  locationCount: number;
  previewImages: string[];
};

type CityAggregation = {
  city: string;
  region: string;
  count: number;
  topLocations: Array<{
    id: string;
    place_id: string | null;
    image: string | null;
  }>;
};

/**
 * GET /api/cities
 * Fetches unique cities from the database with location counts and preview images.
 *
 * @param request - Next.js request object
 * @returns Array of CityOption objects with location counts and preview images
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for database errors
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  try {
    const supabase = await createClient();

    // Fetch all locations to get city/region data
    const { data: locations, error } = await supabase
      .from("locations")
      .select("id, city, region, place_id, image, rating")
      .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
      .order("rating", { ascending: false, nullsFirst: false });

    if (error) {
      logger.error("Failed to fetch locations for cities", {
        error,
        requestId: context.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch cities from database", {
          error: error.message,
        }),
        context
      );
    }

    // Aggregate locations by city
    const cityMap = new Map<string, CityAggregation>();

    for (const location of locations || []) {
      if (!location.city || !location.region) continue;

      const cityKey = location.city.toLowerCase();
      const existing = cityMap.get(cityKey);

      if (existing) {
        existing.count++;
        // Keep top 3 locations for preview images (already sorted by rating)
        if (existing.topLocations.length < 3 && location.place_id) {
          existing.topLocations.push({
            id: location.id,
            place_id: location.place_id,
            image: location.image,
          });
        }
      } else {
        cityMap.set(cityKey, {
          city: location.city,
          region: location.region,
          count: 1,
          topLocations: location.place_id
            ? [
                {
                  id: location.id,
                  place_id: location.place_id,
                  image: location.image,
                },
              ]
            : [],
        });
      }
    }

    // Convert to response format
    const cities: CityOption[] = Array.from(cityMap.values())
      .map((agg) => ({
        id: agg.city.toLowerCase().replace(/\s+/g, "-"),
        name: agg.city,
        region: agg.region,
        locationCount: agg.count,
        previewImages: agg.topLocations
          .slice(0, 3)
          .map((loc) => {
            // Use the location's image field if available, otherwise use photo API
            if (loc.image) {
              return loc.image;
            }
            // Fallback to places photo API if we have a place_id
            if (loc.place_id) {
              return `/api/locations/${loc.id}/primary-photo`;
            }
            return null;
          })
          .filter((img): img is string => img !== null),
      }))
      .sort((a, b) => b.locationCount - a.locationCount); // Sort by location count descending

    // Use standardized response format: { data: [...], meta: { ... } }
    const response = createApiResponse(cities, {
      requestId: context.requestId,
      total: cities.length,
    });

    return addRequestContextHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      }),
      context
    );
  } catch (error) {
    logger.error(
      "Unexpected error fetching cities",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId }
    );
    const message =
      error instanceof Error ? error.message : "Failed to load cities.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context
    );
  }
}
