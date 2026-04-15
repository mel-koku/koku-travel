import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { badRequest, internalError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import {
  SIMILARITY_THRESHOLD,
  MIN_SIMILAR_RESULTS,
  SIMILAR_PLACES_LIMIT,
} from "@/lib/supabase/semanticSearch";

/**
 * GET /api/locations/similar?id=<locationId>
 *
 * Returns up to 6 similar locations based on embedding cosine similarity.
 * Pure DB query via RPC (zero API cost -- uses pre-computed embeddings).
 */
export const GET = withApiHandler(
  async (request, { context }) => {
    const locationId = request.nextUrl.searchParams.get("id");

    if (!locationId) {
      return badRequest("Query parameter 'id' is required", {
        requestId: context.requestId,
      });
    }

    const supabase = await createClient();

    // Fetch the source location's embedding
    const { data: source, error: sourceError } = await supabase
      .from("locations")
      .select("id, embedding")
      .eq("id", locationId)
      .single();

    if (sourceError || !source) {
      return badRequest("Location not found", { requestId: context.requestId });
    }

    if (!source.embedding) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }

    const { data, error } = await supabase.rpc("similar_locations", {
      query_embedding: source.embedding,
      exclude_id: locationId,
      match_count: SIMILAR_PLACES_LIMIT,
      similarity_threshold: SIMILARITY_THRESHOLD,
    });

    if (error) {
      logger.error("Similar places query failed", error, {
        locationId,
        requestId: context.requestId,
      });
      return internalError("Failed to find similar places", { error: error.message }, {
        requestId: context.requestId,
      });
    }

    if (!data || data.length < MIN_SIMILAR_RESULTS) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  },
  { rateLimit: RATE_LIMITS.LOCATIONS },
);
