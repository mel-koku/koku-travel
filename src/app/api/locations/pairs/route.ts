import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { badRequest, internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";
import { fetchNearbyLocations } from "@/lib/locations/hierarchyService";
import {
  LOCATION_LISTING_COLUMNS,
  type LocationListingDbRow,
} from "@/lib/supabase/projections";
import { transformDbRowToLocation } from "@/lib/locations/locationService";

const MAX_IDS = 60;
const NEARBY_RADIUS_KM = 1.0;
// Stricter than /api/locations/similar's 0.3: that endpoint runs on user opt-in
// (detail page); here pairs are surfaced unprompted on the lanes/grid brand
// surface, so we only want strong matches.
const SIMILAR_PAIR_THRESHOLD = 0.45;

export type LocationPair = {
  id: string;
  name: string;
  parentName?: string;
  /**
   * "cluster" = curated relationship row;
   * "nearby" = ≤1km spatial-proximity fallback;
   * "similar" = pgvector cosine fallback when neither curated nor nearby exists.
   */
  kind: "cluster" | "nearby" | "similar";
  /** Walking minutes to the paired place. Only set when kind === "nearby". */
  walkMinutes?: number;
};

export type LocationPairsResponse = Record<string, LocationPair | null>;

/**
 * GET /api/locations/pairs?ids=a,b,c
 *
 * Returns one paired neighbor per source location for /places cards.
 *
 * Cascade:
 *   1. Curated `location_relationships.cluster` row → kind: "cluster"
 *   2. Spatial proximity within 1km → kind: "nearby" + walkMinutes
 *   3. pgvector cosine similarity (top-1 above threshold) → kind: "similar"
 *   4. Otherwise null (UI omits the line)
 *
 * Container parents (`parent_mode='container'`) skip both fallbacks —
 * their children are nearby/similar by definition; surfacing "Near Yanaka"
 * inside Yanaka would be redundant.
 */
export const GET = withApiHandler(
  async (request, { context }) => {
    const idsParam = request.nextUrl.searchParams.get("ids")?.trim();
    if (!idsParam) {
      return badRequest("Query parameter 'ids' is required", {
        requestId: context.requestId,
      });
    }

    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS);

    if (ids.length === 0) {
      return NextResponse.json({} satisfies LocationPairsResponse);
    }

    const startedAt = Date.now();
    const supabase = await createClient();

    // Pass 1: curated cluster relationships (bidirectional).
    const [forwardResult, backwardResult] = await Promise.all([
      supabase
        .from("location_relationships")
        .select("location_id, related_id, sort_order")
        .eq("relationship_type", "cluster")
        .in("location_id", ids),
      supabase
        .from("location_relationships")
        .select("location_id, related_id, sort_order")
        .eq("relationship_type", "cluster")
        .in("related_id", ids),
    ]);

    if (forwardResult.error || backwardResult.error) {
      logger.error(
        "[/api/locations/pairs] cluster query failed",
        (forwardResult.error ?? backwardResult.error)!,
        { requestId: context.requestId },
      );
      return internalError("Failed to fetch pairs", undefined, {
        requestId: context.requestId,
      });
    }

    const clusterPairBySource = new Map<string, { relatedId: string; sortOrder: number }>();
    const consider = (sourceId: string, relatedId: string, sortOrder: number) => {
      if (!ids.includes(sourceId)) return;
      if (sourceId === relatedId) return;
      const existing = clusterPairBySource.get(sourceId);
      if (!existing || sortOrder < existing.sortOrder) {
        clusterPairBySource.set(sourceId, { relatedId, sortOrder });
      }
    };
    for (const row of forwardResult.data ?? []) {
      consider(row.location_id, row.related_id, row.sort_order ?? 0);
    }
    for (const row of backwardResult.data ?? []) {
      consider(row.related_id, row.location_id, row.sort_order ?? 0);
    }

    const clusterRelatedIds = [
      ...new Set([...clusterPairBySource.values()].map((p) => p.relatedId)),
    ];

    // Resolve cluster related rows for name + parentName.
    const clusterRelatedById = new Map<string, { name: string; parentId: string | null }>();
    if (clusterRelatedIds.length > 0) {
      const { data: relatedRows, error: relatedError } = await supabase
        .from("locations")
        .select("id, name, parent_id")
        .in("id", clusterRelatedIds)
        .eq("is_active", true);
      if (relatedError) {
        logger.error("[/api/locations/pairs] cluster name lookup failed", relatedError, {
          requestId: context.requestId,
        });
        return internalError("Failed to resolve pair names", undefined, {
          requestId: context.requestId,
        });
      }
      for (const row of relatedRows ?? []) {
        clusterRelatedById.set(row.id, { name: row.name, parentId: row.parent_id });
      }
    }

    // Pass 2: nearby fallback for IDs without a cluster pair.
    // Skip container sources — their children are nearby by definition.
    const idsWithoutCluster = ids.filter((id) => !clusterPairBySource.has(id));
    const nearbyPairBySource = new Map<
      string,
      { relatedId: string; name: string; parentId: string | null; walkMinutes: number }
    >();
    // Track which sources we've already loaded + filtered for non-container so
    // Pass 3 can reuse the same set without re-querying.
    const nonContainerSourceIds = new Set<string>();
    let nearbyDurationMs = 0;
    let nearbySourceCount = 0;

    if (idsWithoutCluster.length > 0) {
      const nearbyStart = Date.now();
      const { data: sourceRows, error: sourceError } = await supabase
        .from("locations")
        .select(LOCATION_LISTING_COLUMNS)
        .in("id", idsWithoutCluster)
        .eq("is_active", true);

      if (sourceError) {
        logger.warn("[/api/locations/pairs] source lookup failed; skipping nearby", {
          error: sourceError.message,
          requestId: context.requestId,
        });
      } else {
        const sources = (sourceRows as unknown as LocationListingDbRow[] | null ?? [])
          .map(transformDbRowToLocation)
          .filter((s) => s.parentMode !== "container");
        sources.forEach((s) => nonContainerSourceIds.add(s.id));
        const sourcesWithCoords = sources.filter((s) => s.coordinates);
        nearbySourceCount = sourcesWithCoords.length;

        const nearbyResults = await Promise.all(
          sourcesWithCoords.map(async (source) => {
            const nearby = await fetchNearbyLocations(source, NEARBY_RADIUS_KM, 1);
            return { sourceId: source.id, nearby: nearby[0] ?? null };
          }),
        );

        for (const { sourceId, nearby } of nearbyResults) {
          if (!nearby) continue;
          nearbyPairBySource.set(sourceId, {
            relatedId: nearby.id,
            name: nearby.name,
            parentId: nearby.parentId ?? null,
            walkMinutes: Math.max(1, Math.round(nearby.walkMinutes ?? 1)),
          });
        }
      }
      nearbyDurationMs = Date.now() - nearbyStart;
    }

    // Pass 3: pgvector cosine similarity for IDs still without a pair.
    // Reuses pre-computed embeddings (zero new API cost). Restricts targets to
    // top-level peers (the RPC's parent_id IS NULL filter) which fits the
    // "in the same spirit" framing.
    const idsWithoutAnyPair = idsWithoutCluster.filter(
      (id) => !nearbyPairBySource.has(id) && nonContainerSourceIds.has(id),
    );
    const similarPairBySource = new Map<
      string,
      { relatedId: string; name: string; parentId: string | null }
    >();
    let similarDurationMs = 0;

    if (idsWithoutAnyPair.length > 0) {
      const similarStart = Date.now();
      const { data: embeddingRows, error: embeddingError } = await supabase
        .from("locations")
        .select("id, embedding")
        .in("id", idsWithoutAnyPair);

      if (embeddingError) {
        logger.warn("[/api/locations/pairs] embedding lookup failed; skipping similar", {
          error: embeddingError.message,
          requestId: context.requestId,
        });
      } else {
        const sourcesWithEmbedding = (embeddingRows ?? []).filter(
          (row): row is { id: string; embedding: string } =>
            Boolean(row.embedding),
        );

        const similarResults = await Promise.all(
          sourcesWithEmbedding.map(async (source) => {
            const { data, error } = await supabase.rpc("similar_locations", {
              query_embedding: source.embedding,
              exclude_id: source.id,
              match_count: 1,
              similarity_threshold: SIMILAR_PAIR_THRESHOLD,
            });
            if (error || !data || data.length === 0) {
              return { sourceId: source.id, match: null };
            }
            return { sourceId: source.id, match: data[0] };
          }),
        );

        for (const { sourceId, match } of similarResults) {
          if (!match) continue;
          similarPairBySource.set(sourceId, {
            relatedId: match.id,
            name: match.name,
            parentId: match.parent_id ?? null,
          });
        }
      }
      similarDurationMs = Date.now() - similarStart;
    }

    // Resolve all parent names in one pass.
    const allParentIds = [
      ...new Set(
        [
          ...[...clusterRelatedById.values()].map((v) => v.parentId),
          ...[...nearbyPairBySource.values()].map((v) => v.parentId),
          ...[...similarPairBySource.values()].map((v) => v.parentId),
        ].filter((v): v is string => Boolean(v)),
      ),
    ];
    const parentNameMap = new Map<string, string>();
    if (allParentIds.length > 0) {
      const { data: parents } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", allParentIds);
      parents?.forEach((p) => parentNameMap.set(p.id, p.name));
    }

    // Assemble response: cluster wins, nearby is fallback, similar is last.
    const response: LocationPairsResponse = {};
    let clusterMatches = 0;
    let nearbyMatches = 0;
    let similarMatches = 0;
    for (const id of ids) {
      const cluster = clusterPairBySource.get(id);
      if (cluster) {
        const meta = clusterRelatedById.get(cluster.relatedId);
        if (meta) {
          response[id] = {
            id: cluster.relatedId,
            name: meta.name,
            parentName: meta.parentId ? parentNameMap.get(meta.parentId) : undefined,
            kind: "cluster",
          };
          clusterMatches += 1;
          continue;
        }
      }
      const nearby = nearbyPairBySource.get(id);
      if (nearby) {
        response[id] = {
          id: nearby.relatedId,
          name: nearby.name,
          parentName: nearby.parentId ? parentNameMap.get(nearby.parentId) : undefined,
          kind: "nearby",
          walkMinutes: nearby.walkMinutes,
        };
        nearbyMatches += 1;
        continue;
      }
      const similar = similarPairBySource.get(id);
      if (similar) {
        response[id] = {
          id: similar.relatedId,
          name: similar.name,
          parentName: similar.parentId ? parentNameMap.get(similar.parentId) : undefined,
          kind: "similar",
        };
        similarMatches += 1;
        continue;
      }
      response[id] = null;
    }

    logger.info("[/api/locations/pairs] resolved", {
      requestedIds: ids.length,
      clusterMatches,
      nearbyMatches,
      similarMatches,
      nearbySourceCount,
      nearbyDurationMs,
      similarDurationMs,
      totalDurationMs: Date.now() - startedAt,
      requestId: context.requestId,
    });

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=1800" },
    });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);
