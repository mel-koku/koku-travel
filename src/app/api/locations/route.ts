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
} from "@/lib/api/middleware";
import {
  parsePaginationParams,
  createPaginatedResponse,
} from "@/lib/api/pagination";
import { LOCATION_LISTING_COLUMNS, type LocationListingDbRow } from "@/lib/supabase/projections";

/**
 * GET /api/locations
 * Fetches locations from Supabase with pagination and filtering support.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - region: Filter by region (e.g., "Kansai", "Tohoku", "Hokkaido")
 * - category: Filter by category (e.g., "attraction", "food", "nature")
 * - search: Search locations by name (partial match)
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

    // Parse filter parameters
    const searchParams = request.nextUrl.searchParams;
    const region = searchParams.get("region");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Get total count for pagination metadata (with filters)
    // Only count locations with valid place_id to match filtered results
    let countQuery = supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .not("place_id", "is", null)
      .neq("place_id", "");
    if (region) countQuery = countQuery.eq("region", region);
    if (category) countQuery = countQuery.eq("category", category);
    if (search) countQuery = countQuery.ilike("name", `%${search}%`);
    const { count, error: countError } = await countQuery;

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

    // Fetch paginated locations (with filters)
    // Only fetch locations with valid place_id to prevent errors
    let dataQuery = supabase
      .from("locations")
      .select(LOCATION_LISTING_COLUMNS)
      .not("place_id", "is", null)
      .neq("place_id", "");
    if (region) dataQuery = dataQuery.eq("region", region);
    if (category) dataQuery = dataQuery.eq("category", category);
    if (search) dataQuery = dataQuery.ilike("name", `%${search}%`);
    const { data, error } = await dataQuery
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
    // Filter out locations without place_id to avoid errors when fetching details
    // Locations without place_id will fail when trying to resolve Google Place ID
    const rows = (data || []) as unknown as LocationListingDbRow[];
    const locations: Location[] = rows
      .filter((row) => {
        // Only include locations that have a place_id set
        // This prevents "Could not resolve Google Place ID" errors
        return row.place_id != null && row.place_id.trim() !== "";
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        region: row.region,
        city: row.city,
        prefecture: row.prefecture ?? undefined,
        category: row.category,
        image: row.image,
        minBudget: row.min_budget ?? undefined,
        estimatedDuration: row.estimated_duration ?? undefined,
        shortDescription: row.short_description ?? undefined,
        rating: row.rating ?? undefined,
        reviewCount: row.review_count ?? undefined,
        placeId: row.place_id ?? undefined,
        primaryPhotoUrl: row.primary_photo_url ?? undefined,
        // Google Places enrichment fields
        googlePrimaryType: row.google_primary_type ?? undefined,
        googleTypes: row.google_types ?? undefined,
        businessStatus: row.business_status as Location['businessStatus'] ?? undefined,
        priceLevel: row.price_level as Location['priceLevel'] ?? undefined,
        accessibilityOptions: row.accessibility_options ?? undefined,
        dietaryOptions: row.dietary_options ?? undefined,
        serviceOptions: row.service_options ?? undefined,
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

