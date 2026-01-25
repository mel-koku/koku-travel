import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
} from "@/lib/api/middleware";
import type { FilterOption, FilterMetadata } from "@/types/filters";

/**
 * GET /api/locations/filter-options
 * Returns pre-computed filter metadata (cities, categories, regions) with counts.
 * This endpoint aggregates data server-side to avoid client-side processing of all locations.
 *
 * @param request - Next.js request object
 * @returns FilterMetadata object with arrays of filter options
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for database errors
 */
export async function GET(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Optional authentication (for consistency with other endpoints)
  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  try {
    const supabase = await createClient();

    // Only aggregate locations with valid place_id to match main query behavior
    const baseFilter = supabase
      .from("locations")
      .select("*")
      .not("place_id", "is", null)
      .neq("place_id", "");

    // Fetch all locations for aggregation (use column projections for efficiency)
    const { data, error } = await baseFilter.select("city, category, region, prefecture, neighborhood");

    if (error) {
      logger.error("Failed to fetch locations for filter metadata", {
        error,
        requestId: finalContext.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch filter metadata", { error: error.message }, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    // Aggregate counts manually (Supabase doesn't support GROUP BY in select)
    const cityMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const prefectureMap = new Map<string, number>();
    const neighborhoodMap = new Map<string, number>();

    // Helper to normalize prefecture names (remove " Prefecture" suffix)
    const normalizePrefecture = (name: string): string => {
      return name.replace(/\s+Prefecture$/i, '').trim();
    };

    for (const location of data || []) {
      if (location.city) {
        cityMap.set(location.city, (cityMap.get(location.city) || 0) + 1);
      }
      if (location.category) {
        categoryMap.set(location.category, (categoryMap.get(location.category) || 0) + 1);
      }
      if (location.region) {
        regionMap.set(location.region, (regionMap.get(location.region) || 0) + 1);
      }
      if (location.prefecture) {
        // Normalize prefecture name to remove " Prefecture" suffix
        const normalized = normalizePrefecture(location.prefecture);
        prefectureMap.set(normalized, (prefectureMap.get(normalized) || 0) + 1);
      }
      if (location.neighborhood) {
        neighborhoodMap.set(location.neighborhood, (neighborhoodMap.get(location.neighborhood) || 0) + 1);
      }
    }

    // Convert maps to sorted arrays
    const cities: FilterOption[] = Array.from(cityMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const categories: FilterOption[] = Array.from(categoryMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const regions: FilterOption[] = Array.from(regionMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const prefectures: FilterOption[] = Array.from(prefectureMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const neighborhoods: FilterOption[] = Array.from(neighborhoodMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const response: FilterMetadata = {
      cities,
      categories,
      regions,
      prefectures,
      neighborhoods,
    };

    return addRequestContextHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          // Cache for 1 hour - filter options change infrequently
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
        },
      }),
      finalContext,
    );
  } catch (error) {
    logger.error("Unexpected error fetching filter metadata", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
    });
    const message = error instanceof Error ? error.message : "Failed to load filter metadata.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}
