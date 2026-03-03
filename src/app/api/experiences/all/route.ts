import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import type { SupabaseExperience } from "@/types/experience";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { EXPERIENCE_EXPLORE_COLUMNS } from "@/lib/supabase/projections";
import { readFileCache, writeFileCache } from "@/lib/api/fileCache";

/**
 * Two-tier cache: globalThis + file cache.
 * Same pattern as /api/locations/all.
 */
const CACHE_TTL = 30 * 60 * 1000; // 30 min in-memory
const FILE_CACHE_KEY = "experiences-all";
const FILE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hour file cache

type ExperiencesPayload = { data: Location[]; total: number };
type ExperiencesCache = ExperiencesPayload & { cachedAt: number };
const _g = globalThis as typeof globalThis & { __experiencesCache?: ExperiencesCache };

function getCached(): ExperiencesPayload | null {
  const c = _g.__experiencesCache;
  if (c && Date.now() - c.cachedAt <= CACHE_TTL) {
    return { data: c.data, total: c.total };
  }
  const fileData = readFileCache<ExperiencesPayload>(FILE_CACHE_KEY, FILE_CACHE_TTL);
  if (fileData) {
    _g.__experiencesCache = { ...fileData, cachedAt: Date.now() };
    return fileData;
  }
  _g.__experiencesCache = undefined;
  return null;
}

function setCache(data: Location[], total: number) {
  const payload: ExperiencesPayload = { data, total };
  _g.__experiencesCache = { ...payload, cachedAt: Date.now() };
  writeFileCache(FILE_CACHE_KEY, payload);
}

/**
 * Map a Supabase experience row to Location-compatible shape.
 * This allows shared components (PlacesGridB, PlacesMapLayoutB, etc.)
 * to render experiences without modification.
 */
function mapToLocation(row: SupabaseExperience): Location {
  return {
    id: row.id,
    name: row.name,
    region: row.region ?? "",
    city: row.city ?? "",
    prefecture: row.prefecture ?? undefined,
    // Use experience_type as category so components can distinguish
    category: row.experience_type ?? "experience",
    image: row.primary_photo_url ? "" : (row.image ?? ""),
    shortDescription: row.summary ?? row.short_description ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    primaryPhotoUrl: row.primary_photo_url ?? undefined,
    coordinates: row.coordinates ?? undefined,
    craftType: row.craft_type ?? undefined,
    tags: row.tags ?? undefined,
    isHiddenGem: row.is_hidden_gem ?? undefined,
    insiderTip: row.insider_tip ?? undefined,
    operatingHours: row.operating_hours as Location["operatingHours"],
    nameJapanese: row.name_japanese ?? undefined,
    nearestStation: row.nearest_station ?? undefined,
    priceLevel: row.price_level as Location["priceLevel"] ?? undefined,
    sanitySlug: row.sanity_slug ?? undefined,
    hasEditorial: row.has_editorial ?? undefined,
    bookingUrl: row.booking_url ?? undefined,
    difficulty: row.difficulty ?? undefined,
  };
}

/**
 * GET /api/experiences/all
 * Returns all experiences mapped to Location-compatible shape.
 *
 * Response: { data: Location[], total: number }
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const cached = getCached();
  if (cached) {
    return addRequestContextHeaders(
      NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
          "X-Cache": "HIT",
        },
      }),
      context,
    );
  }

  try {
    const supabase = await createClient();

    const PAGE_SIZE = 1000;
    let allRows: SupabaseExperience[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: batch, error } = await supabase
        .from("experiences")
        .select(EXPERIENCE_EXPLORE_COLUMNS)
        .order("name", { ascending: true })
        .range(from, to);

      if (error) {
        logger.error("Failed to fetch experiences page", {
          error,
          page,
          requestId: context.requestId,
        });
        return addRequestContextHeaders(
          internalError("Failed to fetch experiences from database", { error: error.message }, {
            requestId: context.requestId,
          }),
          context,
        );
      }

      const rows = (batch || []) as unknown as SupabaseExperience[];
      allRows = allRows.concat(rows);
      hasMore = rows.length === PAGE_SIZE;
      page++;
    }

    const locations: Location[] = allRows.map(mapToLocation);

    setCache(locations, locations.length);

    return addRequestContextHeaders(
      NextResponse.json(
        { data: locations, total: locations.length },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
            "X-Cache": "MISS",
          },
        },
      ),
      context,
    );
  } catch (error) {
    logger.error("Unexpected error fetching all experiences", error instanceof Error ? error : new Error(String(error)), {
      requestId: context.requestId,
    });
    const message = error instanceof Error ? error.message : "Failed to load experiences.";
    return addRequestContextHeaders(
      internalError(message, undefined, { requestId: context.requestId }),
      context,
    );
  }
}
