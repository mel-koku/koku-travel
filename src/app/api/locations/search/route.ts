import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { applySearchFilter, shouldTrySemanticSearch } from "@/lib/supabase/searchFilters";
import { applyActiveLocationFilters } from "@/lib/supabase/filters";
import { embedText } from "@/lib/server/embeddingService";
import { parseSearchQuery } from "@/lib/search/queryParser";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { rewriteSearchQuery } from "@/lib/server/searchQueryRewriter";

/** Max candidates we'll feed back into FTS from the LLM rewriter. Hard cap. */
const SMART_SEARCH_MAX_CANDIDATES = 5;
/** Smart search runs Gemini, allow longer than the standard 30s. */
export const maxDuration = 30;

/** Pixel width for search-row thumbnails (rendered at 56×56 with 2× DPR headroom). */
const SEARCH_THUMB_WIDTH = 200;

/**
 * Resolve the right photo for a search row.
 *
 * Prefers `primary_photo_url` (canonical post-2026-04-14 — a proxy URL like
 * `/api/places/photo?photoName=...&maxWidthPx=1200`, resized down to thumbnail
 * width). Falls back to the legacy `image` column, which `resizePhotoUrl` strips
 * to `undefined` if it points at the now-private `location-photos` bucket so the
 * UI falls through to its letter-avatar placeholder.
 */
function resolveSearchPhoto(
  primaryPhotoUrl: string | null | undefined,
  image: string | null | undefined,
): string | undefined {
  return (
    resizePhotoUrl(primaryPhotoUrl ?? undefined, SEARCH_THUMB_WIDTH) ??
    resizePhotoUrl(image ?? undefined, SEARCH_THUMB_WIDTH) ??
    undefined
  );
}

/**
 * Relevance tier of a search result relative to the user's current trip context.
 * Used by the UI to de-emphasize "other" results with a softer opacity while
 * keeping them accessible (rank, don't filter).
 */
export type CityTier = "current" | "trip" | "other";

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
  parentId?: string;
  parentName?: string;
  /** Relevance tier vs the trip context passed in `currentCity` / `tripCities`. */
  cityTier?: CityTier;
};

/** Maximum number of results to return */
const MAX_RESULTS = 10;

/**
 * Over-fetch cap when trip context is provided so the post-sort can surface
 * city-matched results that wouldn't have appeared in the alphabetical top-10.
 */
const RANKED_FETCH_LIMIT = 30;

/** Minimum query length */
const MIN_QUERY_LENGTH = 2;

/**
 * Compute the relevance tier of a city name vs the trip's context.
 * Case-insensitive comparison so "Tokyo" matches "tokyo".
 */
function tierFor(
  city: string,
  currentCity: string | undefined,
  tripCities: Set<string>,
): CityTier {
  const normalized = city.toLowerCase();
  if (currentCity && normalized === currentCity.toLowerCase()) return "current";
  if (tripCities.has(normalized)) return "trip";
  return "other";
}

/**
 * Stable sort by relevance tier, preserving the upstream alpha order within
 * each tier. `current` first, then `trip`, then `other`.
 */
function rankByTier(
  results: LocationSearchResult[],
  currentCity: string | undefined,
  tripCities: Set<string>,
): LocationSearchResult[] {
  const tierWeight: Record<CityTier, number> = { current: 0, trip: 1, other: 2 };
  return results
    .map((r, idx) => ({ r: { ...r, cityTier: tierFor(r.city, currentCity, tripCities) }, idx }))
    .sort((a, b) => {
      const wa = tierWeight[a.r.cityTier!];
      const wb = tierWeight[b.r.cityTier!];
      if (wa !== wb) return wa - wb;
      return a.idx - b.idx;
    })
    .map(({ r }) => r);
}

/**
 * GET /api/locations/search
 * Lightweight search endpoint for location autocomplete.
 *
 * Query parameters:
 * - q: Search query (required, min 2 characters)
 * - limit: Max results (default: 10, max: 10)
 * - currentCity: Optional. Trip's current-day city. Results matching this city
 *   are ranked first and tagged `cityTier: "current"`.
 * - tripCities: Optional comma-separated list of all the trip's cities. Results
 *   matching any of these (excluding currentCity) are ranked second and tagged
 *   `cityTier: "trip"`. Everything else is `cityTier: "other"`.
 *
 * Searches across: name, city, region, category
 * Excludes: permanently closed locations
 *
 * When `currentCity` or `tripCities` are set, the route over-fetches up to 30
 * rows and post-sorts by tier so city matches surface even when they wouldn't
 * have appeared in the alphabetical top-10.
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

    const currentCity = searchParams.get("currentCity")?.trim() || undefined;
    const tripCitiesRaw = searchParams.get("tripCities")?.trim();
    const tripCities = new Set(
      (tripCitiesRaw ? tripCitiesRaw.split(",") : [])
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    );
    const hasContext = Boolean(currentCity) || tripCities.size > 0;

    // Validate query parameter
    if (!query || query.length < MIN_QUERY_LENGTH) {
      return badRequest(
        `Query parameter 'q' is required and must be at least ${MIN_QUERY_LENGTH} characters`,
        { requestId: context.requestId }
      );
    }

    const supabase = await createClient();

    // Over-fetch when ranking by trip context so city matches can surface even
    // if they wouldn't have appeared in the alphabetical top-N.
    const fetchLimit = hasContext ? RANKED_FETCH_LIMIT : limit;

    // FTS for queries >= 3 chars (stemming: "skiing" → "ski"), ILIKE fallback for short prefixes
    const baseQuery = applyActiveLocationFilters(
      supabase.from("locations").select("id, name, city, region, category, place_id, image, primary_photo_url, rating, parent_id")
    );

    const { data, error } = await applySearchFilter(baseQuery, query)
      .order("name", { ascending: true })
      .limit(fetchLimit);

    if (error) {
      logger.error("Failed to search locations", error, {
        query,
        requestId: context.requestId,
      });
      return internalError("Failed to search locations", { error: error.message }, {
        requestId: context.requestId,
      });
    }

    // Fetch parent names for child locations
    const parentIds = [...new Set((data || []).map((r) => r.parent_id).filter(Boolean))];
    const parentNameMap = new Map<string, string>();
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", parentIds);
      parents?.forEach((p) => parentNameMap.set(p.id, p.name));
    }

    // Transform to LocationSearchResult
    const results: LocationSearchResult[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region,
      category: row.category,
      placeId: row.place_id ?? "",
      image: resolveSearchPhoto(row.primary_photo_url, row.image),
      rating: row.rating ?? undefined,
      parentId: row.parent_id ?? undefined,
      parentName: row.parent_id ? parentNameMap.get(row.parent_id) : undefined,
    }));

    // Smart-search fallback layers: when keyword (FTS) underperforms (< 5
    // results), fire trigram fuzzy match + semantic embedding search in
    // parallel to backfill. Both are gated on the result count so happy-path
    // queries don't pay extra latency.
    //
    // - Fuzzy match (pg_trgm via fuzzy_search_locations RPC): catches typos
    //   and Japanese-name transliterations that FTS misses, e.g. "amemura" →
    //   "Amerika-Mura". Free, deterministic, ~50ms.
    // - Semantic search (Vertex embeddings via semantic_search_locations RPC):
    //   catches conceptual queries and misremembered names. ~$0.0001 per
    //   query (one Vertex embedding call), ~250ms.
    const parsed = parseSearchQuery(query);
    if (results.length < 5) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runFuzzy = async (): Promise<any[] | null> => {
        try {
          const { data, error } = await supabase.rpc("fuzzy_search_locations", {
            search_query: query,
            match_limit: fetchLimit,
            similarity_threshold: 0.3,
          });
          if (error) {
            // Migration may not yet be applied in this environment. Log and
            // fall through — semantic search alone still works.
            logger.warn("fuzzy_search_locations RPC unavailable", {
              error: error.message,
              requestId: context.requestId,
            });
            return null;
          }
          return data;
        } catch (err) {
          logger.warn("fuzzy_search_locations RPC threw", {
            error: err instanceof Error ? err.message : String(err),
            requestId: context.requestId,
          });
          return null;
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runSemantic = async (): Promise<any[] | null> => {
        if (!shouldTrySemanticSearch(query, parsed.hasStructuredIntent)) return null;
        const queryEmbedding = await embedText(query);
        if (!queryEmbedding) return null;
        const { data } = await supabase.rpc("semantic_search_locations", {
          query_embedding: queryEmbedding,
          match_count: fetchLimit,
          similarity_threshold: 0.3,
        });
        return data;
      };

      const [fuzzyRows, semanticRows] = await Promise.all([runFuzzy(), runSemantic()]);

      const existingIds = new Set(results.map((r) => r.id));

      // Merge fuzzy first (deterministic, often the user's actual intent),
      // then semantic (conceptual fallback).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mergeRpcRows = (rows: any[] | null) => {
        if (!rows || rows.length === 0) return;
        for (const row of rows) {
          if (existingIds.has(row.id)) continue;
          existingIds.add(row.id);
          results.push({
            id: row.id,
            name: row.name,
            city: row.city,
            region: row.region,
            category: row.category,
            placeId: row.place_id ?? "",
            image: resolveSearchPhoto(row.primary_photo_url, row.image),
            rating: row.rating ?? undefined,
            parentId: row.parent_id ?? undefined,
            parentName: row.parent_id ? parentNameMap.get(row.parent_id) : undefined,
          });
        }
      };

      mergeRpcRows(fuzzyRows);
      mergeRpcRows(semanticRows);
    }

    // Rank by trip context when provided, then trim to user's limit. When no
    // context is passed, results stay in their original alpha order (the
    // existing behavior pre-PR-C).
    const ranked = hasContext
      ? rankByTier(results, currentCity, tripCities).slice(0, limit)
      : results.slice(0, limit);

    return NextResponse.json(ranked, {
      status: 200,
      headers: {
        // Cache key includes the trip context via query string, so different
        // trips don't poison each other's cache.
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);

/**
 * Smart-search response: results re-fetched from the catalog using LLM-rewritten
 * candidate place names. Used when keyword + fuzzy + semantic all came up empty
 * and the user explicitly opts into the slower / more expensive path via the
 * "Search smarter ✨" button.
 */
export type SmartSearchResponse = {
  results: LocationSearchResult[];
  /** Candidate place names the LLM thinks the user might mean, in priority order. */
  interpretedAs: string[];
  /** The original query the user typed. */
  originalQuery: string;
};

type SmartSearchRequest = {
  query: string;
  limit?: number;
  currentCity?: string;
  tripCities?: string[];
};

/**
 * POST /api/locations/search
 *
 * Smart search via Gemini Flash query rewriting. NOT the keystroke path —
 * triggered explicitly by the "Search smarter ✨" button in the empty state of
 * LocationSearchBar so per-call Vertex cost (~$0.001-0.005) scales with user
 * intent, not typing.
 *
 * Body: `{ query, limit?, currentCity?, tripCities? }`
 *
 * Behavior:
 * 1. Send the query (+ optional trip context) to Gemini Flash for rewriting
 *    into 1-5 canonical candidate place names.
 * 2. Run FTS for each candidate against the locations catalog. Results are
 *    deduped and ordered by candidate position (first candidate's matches
 *    rank highest).
 * 3. Apply trip-context tier ranking (current/trip/other) on top.
 * 4. Return `{ results, interpretedAs, originalQuery }` so the UI can show
 *    "Showing results for: Amerika-Mura, American Village" — transparent
 *    interpretation.
 *
 * Falls through to an empty result set + empty `interpretedAs` if Gemini
 * fails or returns no candidates. Caller should then surface the
 * "Add as your own" CTA.
 */
export const POST = withApiHandler(
  async (request, { context }) => {
    let body: SmartSearchRequest;
    try {
      body = (await request.json()) as SmartSearchRequest;
    } catch {
      return badRequest("Invalid JSON body.", undefined, { requestId: context.requestId });
    }

    const query = body.query?.trim();
    if (!query || query.length < 2) {
      return badRequest("`query` is required and must be at least 2 characters.", undefined, {
        requestId: context.requestId,
      });
    }

    const limit = Math.min(Math.max(1, body.limit ?? MAX_RESULTS), MAX_RESULTS);
    const currentCity = body.currentCity?.trim() || undefined;
    const tripCities = new Set(
      (body.tripCities ?? [])
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    );

    // Tier 3: rewrite via Gemini.
    const rewrite = await rewriteSearchQuery(query, {
      currentCity,
      tripCities: body.tripCities,
    });

    if (!rewrite || rewrite.candidates.length === 0) {
      const empty: SmartSearchResponse = {
        results: [],
        interpretedAs: [],
        originalQuery: query,
      };
      return NextResponse.json(empty, { status: 200 });
    }

    const candidates = rewrite.candidates.slice(0, SMART_SEARCH_MAX_CANDIDATES);

    const supabase = await createClient();

    // Fetch parent name lookups in one pass after we have all candidate matches.
    const candidateResultsList = await Promise.all(
      candidates.map(async (candidate) => {
        const baseQuery = applyActiveLocationFilters(
          supabase
            .from("locations")
            .select(
              "id, name, city, region, category, place_id, image, primary_photo_url, rating, parent_id",
            ),
        );
        const { data, error } = await applySearchFilter(baseQuery, candidate)
          .order("name", { ascending: true })
          .limit(limit);
        if (error) {
          logger.warn("smart-search: candidate FTS failed", {
            candidate,
            error: error.message,
            requestId: context.requestId,
          });
          return [];
        }
        return data ?? [];
      }),
    );

    // Merge in candidate-priority order. First candidate's matches rank highest.
    const seenIds = new Set<string>();
    const flatRows: Array<{ row: typeof candidateResultsList[number][number] }> = [];
    for (const rows of candidateResultsList) {
      for (const row of rows) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);
        flatRows.push({ row });
      }
    }

    // Resolve parent names for any rows that have a parent_id.
    const parentIds = [...new Set(flatRows.map(({ row }) => row.parent_id).filter(Boolean))];
    const parentNameMap = new Map<string, string>();
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", parentIds);
      parents?.forEach((p) => parentNameMap.set(p.id, p.name));
    }

    let results: LocationSearchResult[] = flatRows.map(({ row }) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region,
      category: row.category,
      placeId: row.place_id ?? "",
      image: resolveSearchPhoto(row.primary_photo_url, row.image),
      rating: row.rating ?? undefined,
      parentId: row.parent_id ?? undefined,
      parentName: row.parent_id ? parentNameMap.get(row.parent_id) : undefined,
    }));

    // Apply trip-context tier ranking (same as GET path).
    const hasContext = Boolean(currentCity) || tripCities.size > 0;
    if (hasContext) {
      results = rankByTier(results, currentCity, tripCities).slice(0, limit);
    } else {
      results = results.slice(0, limit);
    }

    const response: SmartSearchResponse = {
      results,
      interpretedAs: candidates,
      originalQuery: query,
    };

    return NextResponse.json(response, { status: 200 });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS, requireJson: true },
);
