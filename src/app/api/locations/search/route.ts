import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { applySearchFilter } from "@/lib/supabase/searchFilters";
import { applyActiveLocationFilters } from "@/lib/supabase/filters";

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
export const GET = withApiHandler(
  async (request, { context }) => {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim();
    const rawLimit = searchParams.get("limit");
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : MAX_RESULTS;
    const limit = Number.isNaN(parsedLimit)
      ? MAX_RESULTS
      : Math.min(Math.max(1, parsedLimit), MAX_RESULTS);

    // Validate query parameter
    if (!query || query.length < MIN_QUERY_LENGTH) {
      return badRequest(
        `Query parameter 'q' is required and must be at least ${MIN_QUERY_LENGTH} characters`,
        { requestId: context.requestId }
      );
    }

    const supabase = await createClient();

    // FTS for queries >= 3 chars (stemming: "skiing" → "ski"), ILIKE fallback for short prefixes
    const baseQuery = applyActiveLocationFilters(
      supabase.from("locations").select("id, name, city, region, category, place_id, image, rating")
    );

    const { data, error } = await applySearchFilter(baseQuery, query)
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      logger.error("Failed to search locations", {
        error,
        query,
        requestId: context.requestId,
      });
      return internalError("Failed to search locations", { error: error.message }, {
        requestId: context.requestId,
      });
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

    return NextResponse.json(results, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);
