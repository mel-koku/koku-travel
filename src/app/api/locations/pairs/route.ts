import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { badRequest, internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";

const MAX_IDS = 60;

export type LocationPair = {
  id: string;
  name: string;
  parentName?: string;
};

export type LocationPairsResponse = Record<string, LocationPair | null>;

/**
 * GET /api/locations/pairs?ids=a,b,c
 *
 * Returns one curated cluster neighbor per source location, derived from
 * `location_relationships` rows of type 'cluster'. Used by /places cards to
 * render a "Pairs with X" line that reads like a concierge tip.
 *
 * Cluster relationships are bidirectional, so we look at both sides.
 * Returns null for IDs without a cluster pair — UI omits the line entirely.
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

    const supabase = await createClient();

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

    const pairBySource = new Map<string, { relatedId: string; sortOrder: number }>();
    const consider = (sourceId: string, relatedId: string, sortOrder: number) => {
      if (!ids.includes(sourceId)) return;
      if (sourceId === relatedId) return;
      const existing = pairBySource.get(sourceId);
      if (!existing || sortOrder < existing.sortOrder) {
        pairBySource.set(sourceId, { relatedId, sortOrder });
      }
    };

    for (const row of forwardResult.data ?? []) {
      consider(row.location_id, row.related_id, row.sort_order ?? 0);
    }
    for (const row of backwardResult.data ?? []) {
      consider(row.related_id, row.location_id, row.sort_order ?? 0);
    }

    const relatedIds = [...new Set([...pairBySource.values()].map((p) => p.relatedId))];
    if (relatedIds.length === 0) {
      return NextResponse.json(
        Object.fromEntries(ids.map((id) => [id, null])) satisfies LocationPairsResponse,
        {
          headers: { "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=1800" },
        },
      );
    }

    const { data: relatedRows, error: relatedError } = await supabase
      .from("locations")
      .select("id, name, parent_id")
      .in("id", relatedIds)
      .eq("is_active", true);

    if (relatedError) {
      logger.error("[/api/locations/pairs] related lookup failed", relatedError, {
        requestId: context.requestId,
      });
      return internalError("Failed to resolve pair names", undefined, {
        requestId: context.requestId,
      });
    }

    const parentIds = [
      ...new Set((relatedRows ?? []).map((r) => r.parent_id).filter((v): v is string => Boolean(v))),
    ];
    const parentNameMap = new Map<string, string>();
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", parentIds);
      parents?.forEach((p) => parentNameMap.set(p.id, p.name));
    }

    const relatedById = new Map<string, { name: string; parentName?: string }>();
    for (const row of relatedRows ?? []) {
      relatedById.set(row.id, {
        name: row.name,
        parentName: row.parent_id ? parentNameMap.get(row.parent_id) : undefined,
      });
    }

    const response: LocationPairsResponse = {};
    for (const id of ids) {
      const pair = pairBySource.get(id);
      if (!pair) {
        response[id] = null;
        continue;
      }
      const related = relatedById.get(pair.relatedId);
      response[id] = related ? { id: pair.relatedId, name: related.name, parentName: related.parentName } : null;
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=1800" },
    });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);
