import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { badRequest, internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";

const MAX_IDS = 60;

export type LocationDurationsResponse = Record<string, number>;

/**
 * GET /api/locations/durations?ids=a,b,c
 *
 * Returns the summed sub_experiences.time_estimate (in minutes) per source
 * location id. Locations with no sub-experiences (or only entries with null/
 * zero time_estimate) are absent from the response — callers should fall back
 * to the curated `estimatedDuration` or the category-based static estimate.
 *
 * Why a sum: the fit hint on /places cards answers "how long does this take?"
 * Sum slightly over-estimates when sub-experiences overlap — the safer bias
 * for trip planning vs. arriving with too little time.
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
      return NextResponse.json({} satisfies LocationDurationsResponse);
    }

    const startedAt = Date.now();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sub_experiences")
      .select("location_id, time_estimate")
      .in("location_id", ids)
      .not("time_estimate", "is", null)
      .gt("time_estimate", 0);

    if (error) {
      logger.error("[/api/locations/durations] query failed", error, {
        requestId: context.requestId,
      });
      return internalError("Failed to fetch durations", undefined, {
        requestId: context.requestId,
      });
    }

    const totals: LocationDurationsResponse = {};
    for (const row of data ?? []) {
      const minutes = row.time_estimate;
      if (typeof minutes !== "number") continue;
      totals[row.location_id] = (totals[row.location_id] ?? 0) + minutes;
    }

    logger.info("[/api/locations/durations] resolved", {
      requestedIds: ids.length,
      matchedIds: Object.keys(totals).length,
      rowsScanned: data?.length ?? 0,
      durationMs: Date.now() - startedAt,
      requestId: context.requestId,
    });

    return NextResponse.json(totals, {
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);
