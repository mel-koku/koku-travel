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

export type Airport = {
  id: string;
  iataCode: string;
  name: string;
  nameJa: string | null;
  shortName: string;
  city: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isInternational: boolean;
  isPopular: boolean;
};

type AirportRow = {
  id: string;
  iata_code: string;
  name: string;
  name_ja: string | null;
  short_name: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  is_international: boolean;
  is_popular: boolean;
};

function transformAirport(row: AirportRow): Airport {
  return {
    id: row.id,
    iataCode: row.iata_code,
    name: row.name,
    nameJa: row.name_ja,
    shortName: row.short_name,
    city: row.city,
    region: row.region,
    coordinates: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    isInternational: row.is_international,
    isPopular: row.is_popular,
  };
}

/**
 * GET /api/airports
 * Fetches airports from the database with optional search and filtering.
 *
 * Query parameters:
 *   - search: Search term to filter airports by name, city, or IATA code
 *   - popular: If "true", only return popular airports (for quick picks)
 *
 * @param request - Next.js request object
 * @returns Array of Airport objects
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
    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim().toLowerCase();
    const popularOnly = searchParams.get("popular") === "true";

    // Build query
    let query = supabase
      .from("airports")
      .select("id, iata_code, name, name_ja, short_name, city, region, lat, lng, is_international, is_popular")
      .order("is_popular", { ascending: false })
      .order("name", { ascending: true });

    // Filter by popular if requested
    if (popularOnly) {
      query = query.eq("is_popular", true);
    }

    const { data: airports, error } = await query;

    if (error) {
      logger.error("Failed to fetch airports", {
        error,
        requestId: context.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch airports from database", {
          error: error.message,
        }),
        context
      );
    }

    // Transform and filter results
    let results = (airports || []).map(transformAirport);

    // Client-side search filtering (more flexible than SQL)
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase();
      results = results.filter((airport) => {
        return (
          airport.name.toLowerCase().includes(searchLower) ||
          airport.city.toLowerCase().includes(searchLower) ||
          airport.iataCode.toLowerCase().includes(searchLower) ||
          airport.shortName.toLowerCase().includes(searchLower) ||
          (airport.nameJa && airport.nameJa.includes(search))
        );
      });
    }

    // Use standardized response format: { data: [...], meta: { ... } }
    const response = createApiResponse(results, {
      requestId: context.requestId,
      total: results.length,
    });

    return addRequestContextHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          // Cache for 5 minutes
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      }),
      context
    );
  } catch (error) {
    logger.error(
      "Unexpected error fetching airports",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: context.requestId }
    );
    const message =
      error instanceof Error ? error.message : "Failed to load airports.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context
    );
  }
}
