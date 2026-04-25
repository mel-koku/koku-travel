import { NextRequest, NextResponse } from "next/server";
import { mapboxSuggest, mapboxRetrieve } from "@/lib/addressSearch/mapbox";
import { googleSearch, googleRetrieve } from "@/lib/addressSearch/google";
import { checkAndIncrement } from "@/lib/addressSearch/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, createErrorResponse } from "@/lib/api/errors";

const DAILY_CAP = 100;

type ReqBody =
  | { action: "suggest"; provider: "mapbox" | "google"; query: string; sessionToken: string }
  | { action: "retrieve"; provider: "mapbox" | "google"; id: string; sessionToken: string };

export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    const requestId = context.requestId;
    let body: ReqBody;
    try {
      body = (await request.json()) as ReqBody;
    } catch {
      return badRequest("invalid json", undefined, { requestId });
    }

    // Per-user daily cap, separate from per-minute rate limit applied above.
    const supabase = await createClient();
    if (body.action === "suggest") {
      try {
        const limit = await checkAndIncrement(supabase, user!.id, DAILY_CAP);
        if (!limit.allowed) {
          return createErrorResponse(
            "rate limit exceeded",
            429,
            "DAILY_QUOTA_EXCEEDED",
            undefined,
            { requestId },
          );
        }
      } catch (err) {
        // Fail-open: allow the request but log the infra issue
        logger.error(
          "[address-search] rate limit check failed, allowing",
          err instanceof Error ? err : new Error(String(err)),
          { requestId },
        );
      }
    }

    const mapboxKey = process.env.ROUTING_MAPBOX_ACCESS_TOKEN;
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;

    try {
      if (body.action === "suggest") {
        const suggestions =
          body.provider === "mapbox"
            ? await mapboxSuggest(body.query, body.sessionToken, mapboxKey ?? "")
            : await googleSearch(body.query, body.sessionToken, googleKey ?? "");
        return NextResponse.json({ suggestions });
      } else {
        const result =
          body.provider === "mapbox"
            ? await mapboxRetrieve(body.id, body.sessionToken, mapboxKey ?? "")
            : await googleRetrieve(body.id, body.sessionToken, googleKey ?? "");
        return NextResponse.json({ result });
      }
    } catch (err) {
      return createErrorResponse(
        err instanceof Error ? err.message : "unknown",
        502,
        "UPSTREAM_ERROR",
        undefined,
        { requestId },
      );
    }
  },
  {
    rateLimit: RATE_LIMITS.ADDRESS_SEARCH,
    requireAuth: true,
    requireJson: true,
  },
);
