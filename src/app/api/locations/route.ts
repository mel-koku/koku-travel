import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
  type RequestContext,
} from "@/lib/api/middleware";
import {
  parsePaginationParams,
  createPaginatedResponse,
  type PaginationConfig,
} from "@/lib/api/pagination";

/**
 * GET /api/locations
 * Fetches locations from Supabase with pagination support.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * @param request - Next.js request object
 * @returns Paginated array of Location objects, or error response
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

  // Optional authentication (for future user-specific filtering)
  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  try {
    const supabase = await createClient();
    const pagination = parsePaginationParams(request);

    // Get total count for pagination metadata
    const { count, error: countError } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    if (countError) {
      logger.error("Failed to count locations", {
        error: countError,
        requestId: finalContext.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch locations from database", { error: countError.message }, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    const total = count || 0;

    // Fetch paginated locations
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      logger.error("Failed to fetch locations from Supabase", {
        error,
        requestId: finalContext.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch locations from database", { error: error.message }, {
          requestId: finalContext.requestId,
        }),
        finalContext,
      );
    }

    // Transform Supabase data to Location type
    const locations: Location[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      region: row.region,
      city: row.city,
      category: row.category,
      image: row.image,
      minBudget: row.min_budget ?? undefined,
      estimatedDuration: row.estimated_duration ?? undefined,
      operatingHours: row.operating_hours ?? undefined,
      recommendedVisit: row.recommended_visit ?? undefined,
      preferredTransitModes: row.preferred_transit_modes ?? undefined,
      coordinates: row.coordinates ?? undefined,
      timezone: row.timezone ?? undefined,
      shortDescription: row.short_description ?? undefined,
      rating: row.rating ?? undefined,
      reviewCount: row.review_count ?? undefined,
      placeId: row.place_id ?? undefined,
    }));

    // Create paginated response
    const response = createPaginatedResponse(locations, total, pagination);

    return addRequestContextHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      }),
      finalContext,
    );
  } catch (error) {
    logger.error("Unexpected error fetching locations", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
    });
    const message = error instanceof Error ? error.message : "Failed to load locations.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}

