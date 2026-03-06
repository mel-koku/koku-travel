import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { fetchLocationsByIdsForListing } from "@/lib/locations/locationService";

/**
 * Maximum number of location IDs allowed per request
 */
const MAX_IDS_PER_REQUEST = 100;

/**
 * GET /api/locations/batch
 * Fetches multiple locations by their IDs in a single request.
 *
 * Query parameters:
 * - ids: Comma-separated list of location IDs (max 100)
 *
 * @param request - Next.js request object
 * @returns Array of Location objects, or error response
 * @throws Returns 400 if no IDs provided or too many IDs
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for database errors
 */
export const GET = withApiHandler(
  async (request, { context }) => {
    // Parse IDs from query string
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");

    if (!idsParam || idsParam.trim() === "") {
      return badRequest("Missing required 'ids' parameter", undefined, {
        requestId: context.requestId,
      });
    }

    // Parse, validate, and deduplicate IDs
    const ids = [...new Set(
      idsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    )];

    if (ids.length === 0) {
      return badRequest("No valid IDs provided", undefined, {
        requestId: context.requestId,
      });
    }

    if (ids.length > MAX_IDS_PER_REQUEST) {
      return badRequest(
        `Too many IDs. Maximum ${MAX_IDS_PER_REQUEST} IDs per request, got ${ids.length}`,
        undefined,
        { requestId: context.requestId },
      );
    }

    // Fetch locations from database
    const locations = await fetchLocationsByIdsForListing(ids);

    // Return with cache headers (5 minutes)
    return NextResponse.json(
      { data: locations },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  },
  { rateLimit: RATE_LIMITS.LOCATIONS_BATCH },
);
