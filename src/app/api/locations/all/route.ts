import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { LOCATION_EXPLORE_COLUMNS, type LocationExploreDbRow } from "@/lib/supabase/projections";
import { readFileCache, writeFileCache } from "@/lib/api/fileCache";
import { applyActiveLocationFilters } from "@/lib/supabase/filters";
import { normalizeOperatingHours } from "@/lib/locations/normalizeHours";

/**
 * Two-tier cache: globalThis (survives Turbopack module re-eval) +
 * file cache (survives dev server restarts). This prevents Supabase
 * fetch timeouts during Turbopack compilation pressure.
 */
const CACHE_TTL = 30 * 60 * 1000; // 30 min in-memory cache
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
export const GET = withApiHandler(
  async (_request, { context }) => {
    // Serve from in-memory cache if available (avoids Supabase fetch during Turbopack compilation)
    const cached = getCached();
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "HIT",
        },
      });
    }

    const supabase = await createClient();

    // Supabase PostgREST caps results at 1000 rows per request,
    // so we paginate. First get the count, then fetch all pages in parallel.
    const PAGE_SIZE = 1000;

    const { count, error: countError } = await applyActiveLocationFilters(
      supabase.from("locations").select("id", { count: "exact", head: true })
    ).eq("is_accommodation", false)
      .is("parent_id", null); // Only top-level locations in browse grid

    if (countError) {
      logger.error("Failed to count locations", countError, { requestId: context.requestId });
      return internalError("Failed to fetch locations from database", { error: countError.message }, {
        requestId: context.requestId,
      });
    }

    const totalRows = count ?? 4000; // fallback estimate if count is null
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);

    // Fetch all pages in parallel
    const pagePromises = Array.from({ length: totalPages }, (_, page) => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      return applyActiveLocationFilters(
        supabase.from("locations").select(LOCATION_EXPLORE_COLUMNS)
      ).eq("is_accommodation", false)
        .is("parent_id", null) // Only top-level locations in browse grid
        .order("name", { ascending: true })
        .range(from, to);
    });

    const pageResults = await Promise.all(pagePromises);

    // Check for errors and concat results
    let allRows: LocationExploreDbRow[] = [];
    for (const [i, result] of pageResults.entries()) {
      const { data: batch, error } = result;
      if (error) {
        logger.error("Failed to fetch locations page", error, {
          page: i,
          requestId: context.requestId,
        });
        return internalError("Failed to fetch locations from database", { error: error.message }, {
          requestId: context.requestId,
        });
      }
      const rows = (batch || []) as unknown as LocationExploreDbRow[];
      allRows = allRows.concat(rows);
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
      shortDescription: row.short_description ?? undefined,
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
      isFeatured: row.is_featured ?? undefined,
      jtaApproved: row.jta_approved ?? undefined,
      nameJapanese: row.name_japanese ?? undefined,
      nearestStation: row.nearest_station ?? undefined,
      cashOnly: row.cash_only ?? undefined,
      paymentTypes: (row.payment_types as Location["paymentTypes"]) ?? undefined,
      dietaryFlags: (row.dietary_flags as Location["dietaryFlags"]) ?? undefined,
      reservationInfo: row.reservation_info ?? undefined,
      operatingHours: normalizeOperatingHours(row.operating_hours),
      goodForChildren: row.good_for_children ?? undefined,
      goodForGroups: row.good_for_groups ?? undefined,
      mealOptions: row.meal_options ?? undefined,
      serviceOptions: row.service_options ?? undefined,
      tags: row.tags ?? undefined,
      cuisineType: row.cuisine_type ?? undefined,
      craftType: row.craft_type ?? undefined,
      isUnescoSite: row.is_unesco_site ?? undefined,
    }));

    // Cache the result in-memory
    setCache(locations, locations.length);

    return NextResponse.json(
      { data: locations, total: locations.length },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "MISS",
        },
      },
    );
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);
