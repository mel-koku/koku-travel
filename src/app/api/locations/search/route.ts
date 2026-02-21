import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { applySearchFilter } from "@/lib/supabase/searchFilters";

/**
 * Lightweight search result for autocomplete
 * Only includes fields needed for display and selection
 */
export type LocationSearchResult = {
  id: string;
  name: string;
  city: string;
  region: string;
  category: string;
  placeId: string;
  image?: string;
  rating?: number;
};

/** Maximum number of results to return */
const MAX_RESULTS = 10;

/** Minimum query length */
const MIN_QUERY_LENGTH = 2;

/**
 * GET /api/locations/search
 * Lightweight search endpoint for location autocomplete.
 *
 * Query parameters:
 * - q: Search query (required, min 2 characters)
 * - limit: Max results (default: 10, max: 10)
 *
 * Searches across: name, city, region, category
 * Excludes: permanently closed locations
 *
 * @returns Array of LocationSearchResult
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
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim();
    const rawLimit = searchParams.get("limit");
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : MAX_RESULTS;
    const limit = Number.isNaN(parsedLimit)
      ? MAX_RESULTS
      : Math.min(Math.max(1, parsedLimit), MAX_RESULTS);

    // Validate query parameter
    if (!query || query.length < MIN_QUERY_LENGTH) {
      return addRequestContextHeaders(
        badRequest(
          `Query parameter 'q' is required and must be at least ${MIN_QUERY_LENGTH} characters`,
          { requestId: context.requestId }
        ),
        context
      );
    }

    const supabase = await createClient();

    // FTS for queries >= 3 chars (stemming: "skiing" → "ski"), ILIKE fallback for short prefixes
    const baseQuery = supabase
      .from("locations")
      .select("id, name, city, region, category, place_id, image, rating")
      .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED");

    const { data, error } = await applySearchFilter(baseQuery, query)
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      logger.error("Failed to search locations", {
        error,
        query,
        requestId: context.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to search locations", { error: error.message }, {
          requestId: context.requestId,
        }),
        context
      );
    }

    // Transform to LocationSearchResult
    const results: LocationSearchResult[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region,
      category: row.category,
      placeId: row.place_id ?? "",
      image: row.image || undefined,
      rating: row.rating ?? undefined,
    }));

    return addRequestContextHeaders(
      NextResponse.json(results, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
        },
      }),
      context
    );
  } catch (error) {
    logger.error(
      "Unexpected error searching locations",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId }
    );
    const message =
      error instanceof Error ? error.message : "Failed to search locations.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context
    );
  }
}
