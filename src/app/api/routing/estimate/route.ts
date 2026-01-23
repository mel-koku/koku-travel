import { NextRequest, NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  addRequestContextHeaders,
  createRequestContext,
  getOptionalAuth,
} from "@/lib/api/middleware";
import { readBodyWithSizeLimit } from "@/lib/api/bodySizeLimit";
import { badRequest, internalError } from "@/lib/api/errors";

const ROUTING_RATE_LIMIT = { maxRequests: 100, windowMs: 60 * 1000 };
const MAX_REQUEST_SIZE = 64 * 1024; // 64KB is generous for routing payloads
const VALID_MODES = new Set(["driving", "walking", "transit", "cycling"]);

/**
 * POST /api/routing/estimate
 *
 * Estimates travel time and distance for a route.
 * Returns a lightweight response with just duration and distance.
 */
export async function POST(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, ROUTING_RATE_LIMIT);
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  const { body, response: sizeError } = await readBodyWithSizeLimit(request, MAX_REQUEST_SIZE);
  if (sizeError) {
    return addRequestContextHeaders(sizeError, finalContext);
  }

  if (!body) {
    return addRequestContextHeaders(
      badRequest("Request body is required.", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }

  let payload: RoutingRequest;
  try {
    payload = JSON.parse(body) as RoutingRequest;
  } catch {
    return addRequestContextHeaders(
      badRequest("Invalid JSON in request body.", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }

  if (!payload.origin || !payload.destination || !payload.mode) {
    return addRequestContextHeaders(
      badRequest("Missing required fields: origin, destination, mode", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  if (!VALID_MODES.has(payload.mode)) {
    return addRequestContextHeaders(
      badRequest(`Invalid mode. Must be one of: ${Array.from(VALID_MODES).join(", ")}`, undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  try {
    const result = await requestRoute(payload);
    // "mock" provider indicates heuristic estimate (not from real routing API)
    const isEstimated = result.provider === "mock";
    return addRequestContextHeaders(
      NextResponse.json(
        {
          mode: result.mode,
          durationMinutes: Math.round(result.durationSeconds / 60),
          distanceMeters: result.distanceMeters,
          isEstimated,
        },
        {
          headers: {
            "Cache-Control": "private, max-age=30",
          },
        },
      ),
      finalContext,
    );
  } catch (error) {
    logger.error("Routing estimate error", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      mode: payload.mode,
    });
    return addRequestContextHeaders(
      internalError(
        error instanceof Error ? error.message : "Failed to estimate route",
        undefined,
        { requestId: finalContext.requestId },
      ),
      finalContext,
    );
  }
}

