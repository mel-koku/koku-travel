import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import type { FilterOption, FilterMetadata } from "@/types/filters";
import { readFileCache, writeFileCache } from "@/lib/api/fileCache";

/** Two-tier cache: globalThis + file (survives dev server restarts) */
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FILE_CACHE_KEY = "filter-options";
const FILE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours (file cache longer)
type FilterCache = { data: FilterMetadata; cachedAt: number };
const _g = globalThis as typeof globalThis & { __filterOptionsCache?: FilterCache };

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

  // Tier 1: globalThis cache (fastest)
  if (_g.__filterOptionsCache && Date.now() - _g.__filterOptionsCache.cachedAt < CACHE_TTL) {
    return addRequestContextHeaders(
      NextResponse.json(_g.__filterOptionsCache.data, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
          "X-Cache": "HIT",
        },
      }),
      context,
    );
  }

  // Tier 2: file cache (survives dev server restarts)
  const fileCached = readFileCache<FilterMetadata>(FILE_CACHE_KEY, FILE_CACHE_TTL);
  if (fileCached) {
    _g.__filterOptionsCache = { data: fileCached, cachedAt: Date.now() };
    return addRequestContextHeaders(
      NextResponse.json(fileCached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
          "X-Cache": "HIT-FILE",
        },
      }),
      context,
    );
  }

  try {
    const supabase = await createClient();

    // Fetch only the columns needed for aggregation (not select("*"))
    const { data, error } = await supabase
      .from("locations")
      .select("city, category, region, prefecture, neighborhood")
      .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
      .range(0, 9999);

    if (error) {
      logger.error("Failed to fetch locations for filter metadata", {
        error,
        requestId: context.requestId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch filter metadata", { error: error.message }, {
          requestId: context.requestId,
        }),
        context,
      );
    }

    // Aggregate counts manually (Supabase doesn't support GROUP BY in select)
    const cityMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const prefectureMap = new Map<string, number>();
    const neighborhoodMap = new Map<string, number>();

    // Helper to normalize prefecture names
    // Handles various suffixes from different data sources:
    // - " Prefecture" (English suffix)
    // - "-ken" (most prefectures)
    // - "-fu" (Osaka-fu, Kyoto-fu)
    // - "-to" (Tokyo-to)
    // Note: "Hokkaido" is kept as-is since "-do" is part of its name
    const normalizePrefecture = (name: string): string => {
      return name
        .replace(/\s+Prefecture$/i, '')
        .replace(/-ken$/i, '')
        .replace(/-fu$/i, '')
        .replace(/-to$/i, '')
        .trim();
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

    // Cache the result (globalThis + file)
    _g.__filterOptionsCache = { data: response, cachedAt: Date.now() };
    writeFileCache(FILE_CACHE_KEY, response);

    return addRequestContextHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          // Cache for 1 hour - filter options change infrequently
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
        },
      }),
      context,
    );
  } catch (error) {
    logger.error("Unexpected error fetching filter metadata", error instanceof Error ? error : new Error(String(error)), {
      requestId: context.requestId,
    });
    const message = error instanceof Error ? error.message : "Failed to load filter metadata.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}
