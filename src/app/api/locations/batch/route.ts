import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
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
export async function GET(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 200 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 200,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  try {
    // Parse IDs from query string
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");

    if (!idsParam || idsParam.trim() === "") {
      return addRequestContextHeaders(
        badRequest("Missing required 'ids' parameter", undefined, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    // Parse and validate IDs
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return addRequestContextHeaders(
        badRequest("No valid IDs provided", undefined, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    if (ids.length > MAX_IDS_PER_REQUEST) {
      return addRequestContextHeaders(
        badRequest(
          `Too many IDs. Maximum ${MAX_IDS_PER_REQUEST} IDs per request, got ${ids.length}`,
          undefined,
          { requestId: context.requestId },
        ),
        context,
      );
    }

    // Fetch locations from database
    const locations = await fetchLocationsByIdsForListing(ids);

    // Return with cache headers (5 minutes)
    return addRequestContextHeaders(
      NextResponse.json(
        { data: locations },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        },
      ),
      context,
    );
  } catch (error) {
    logger.error(
      "Unexpected error fetching locations by IDs",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId },
    );
    const message =
      error instanceof Error ? error.message : "Failed to load locations.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}
