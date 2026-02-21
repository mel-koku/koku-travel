import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { LOCATION_EXPLORE_COLUMNS, type LocationExploreDbRow } from "@/lib/supabase/projections";
import { readFileCache, writeFileCache } from "@/lib/api/fileCache";

/**
 * Two-tier cache: globalThis (survives Turbopack module re-eval) +
 * file cache (survives dev server restarts). This prevents Supabase
 * fetch timeouts during Turbopack compilation pressure.
 */
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const FILE_CACHE_KEY = "locations-all";
const FILE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hour file cache (longer since it's fallback)

type LocationsPayload = { data: Location[]; total: number };
type LocationsCache = LocationsPayload & { cachedAt: number };
const _g = globalThis as typeof globalThis & { __locationsCache?: LocationsCache };

function getCached(): LocationsPayload | null {
  // Tier 1: globalThis (fastest)
  const c = _g.__locationsCache;
  if (c && Date.now() - c.cachedAt <= CACHE_TTL) {
    return { data: c.data, total: c.total };
  }
  // Tier 2: file cache (survives restarts)
  const fileData = readFileCache<LocationsPayload>(FILE_CACHE_KEY, FILE_CACHE_TTL);
  if (fileData) {
    // Promote to globalThis for next request
    _g.__locationsCache = { ...fileData, cachedAt: Date.now() };
    return fileData;
  }
  _g.__locationsCache = undefined;
  return null;
}

function setCache(data: Location[], total: number) {
  const payload: LocationsPayload = { data, total };
  _g.__locationsCache = { ...payload, cachedAt: Date.now() };
  writeFileCache(FILE_CACHE_KEY, payload);
}

/**
 * GET /api/locations/all
 * Returns all locations in a single response (excluding permanently closed).
 * Uses LOCATION_EXPLORE_COLUMNS — a slimmed 16-column projection.
 *
 * Response: { data: Location[], total: number }
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Serve from in-memory cache if available (avoids Supabase fetch during Turbopack compilation)
  const cached = getCached();
  if (cached) {
    return addRequestContextHeaders(
      NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "HIT",
        },
      }),
      context,
    );
  }

  try {
    const supabase = await createClient();

    // Supabase PostgREST caps results at 1000 rows per request,
    // so we paginate to fetch all locations.
    const PAGE_SIZE = 1000;
    let allRows: LocationExploreDbRow[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: batch, error } = await supabase
        .from("locations")
        .select(LOCATION_EXPLORE_COLUMNS)
        .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
        .order("name", { ascending: true })
        .range(from, to);

      if (error) {
        logger.error("Failed to fetch locations page", {
          error,
          page,
          requestId: context.requestId,
        });
        return addRequestContextHeaders(
          internalError("Failed to fetch locations from database", { error: error.message }, {
            requestId: context.requestId,
          }),
          context,
        );
      }

      const rows = (batch || []) as unknown as LocationExploreDbRow[];
      allRows = allRows.concat(rows);
      hasMore = rows.length === PAGE_SIZE;
      page++;
    }

    const locations: Location[] = allRows.map((row) => ({
      id: row.id,
      name: row.name,
      region: row.region,
      city: row.city,
      prefecture: row.prefecture ?? undefined,
      category: row.category,
      // Only include image when primaryPhotoUrl is absent (saves ~500KB)
      image: row.primary_photo_url ? "" : row.image,
      estimatedDuration: row.estimated_duration ?? undefined,
      rating: row.rating ?? undefined,
      reviewCount: row.review_count ?? undefined,
      primaryPhotoUrl: row.primary_photo_url ?? undefined,
      googlePrimaryType: row.google_primary_type ?? undefined,
      priceLevel: row.price_level as Location['priceLevel'] ?? undefined,
      accessibilityOptions: row.accessibility_options ?? undefined,
      dietaryOptions: row.dietary_options ?? undefined,
      coordinates: row.coordinates ?? undefined,
      isHiddenGem: row.is_hidden_gem ?? undefined,
      nameJapanese: row.name_japanese ?? undefined,
      nearestStation: row.nearest_station ?? undefined,
      cashOnly: row.cash_only ?? undefined,
      reservationInfo: row.reservation_info ?? undefined,
      operatingHours: row.operating_hours ?? undefined,
      goodForChildren: row.good_for_children ?? undefined,
      goodForGroups: row.good_for_groups ?? undefined,
      mealOptions: row.meal_options ?? undefined,
      serviceOptions: row.service_options ?? undefined,
      tags: row.tags ?? undefined,
    }));

    // Cache the result in-memory
    setCache(locations, locations.length);

    return addRequestContextHeaders(
      NextResponse.json(
        { data: locations, total: locations.length },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
            "X-Cache": "MISS",
          },
        },
      ),
      context,
    );
  } catch (error) {
    logger.error("Unexpected error fetching all locations", error instanceof Error ? error : new Error(String(error)), {
      requestId: context.requestId,
    });
    const message = error instanceof Error ? error.message : "Failed to load locations.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}
