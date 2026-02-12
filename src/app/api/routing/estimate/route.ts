import { NextRequest, NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";
import { toRoutingMode, VALID_ROUTING_MODES } from "@/lib/routing/types";
import type { ItineraryTravelMode } from "@/types/itinerary";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  addRequestContextHeaders,
  createRequestContext,
  getOptionalAuth,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { readBodyWithSizeLimit } from "@/lib/api/bodySizeLimit";
import { badRequest, internalError } from "@/lib/api/errors";

const ROUTING_RATE_LIMIT = { maxRequests: 100, windowMs: 60 * 1000 };
const MAX_REQUEST_SIZE = 64 * 1024; // 64KB is generous for routing payloads

/**
 * Valid internal travel modes that can be translated to routing modes.
 */
const VALID_INTERNAL_MODES = new Set<string>([
  "walk", "car", "taxi", "bicycle", "train", "subway", "bus", "tram", "ferry", "transit", "rideshare",
  // Also accept already-translated modes for flexibility
  "driving", "walking", "cycling",
]);

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

  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

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

  // Validate and translate internal travel mode to routing mode
  if (!VALID_INTERNAL_MODES.has(payload.mode)) {
    return addRequestContextHeaders(
      badRequest(`Invalid mode "${payload.mode}". Must be one of: ${Array.from(VALID_INTERNAL_MODES).join(", ")}`, undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  // Translate internal mode to routing API mode
  const routingMode = VALID_ROUTING_MODES.has(payload.mode as "driving" | "walking" | "transit" | "cycling")
    ? payload.mode as "driving" | "walking" | "transit" | "cycling"
    : toRoutingMode(payload.mode as ItineraryTravelMode);

  try {
    const routingRequest: RoutingRequest = {
      ...payload,
      mode: routingMode,
    };
    const result = await requestRoute(routingRequest);
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

