import { NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";
import { toRoutingMode, VALID_ROUTING_MODES } from "@/lib/routing/types";
import type { ItineraryTravelMode } from "@/types/itinerary";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { readBodyWithSizeLimit } from "@/lib/api/bodySizeLimit";
import { badRequest, internalError } from "@/lib/api/errors";

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
export const POST = withApiHandler(
  async (request, { context }) => {
    const { body, response: sizeError } = await readBodyWithSizeLimit(request, MAX_REQUEST_SIZE);
    if (sizeError) {
      return sizeError;
    }

    if (!body) {
      return badRequest("Request body is required.", undefined, { requestId: context.requestId });
    }

    let payload: RoutingRequest;
    try {
      payload = JSON.parse(body) as RoutingRequest;
    } catch {
      return badRequest("Invalid JSON in request body.", undefined, { requestId: context.requestId });
    }

    if (!payload.origin || !payload.destination || !payload.mode) {
      return badRequest("Missing required fields: origin, destination, mode", undefined, {
        requestId: context.requestId,
      });
    }

    // Validate coordinates are finite numbers within Japan bounds
    const coords = [payload.origin, payload.destination];
    for (const coord of coords) {
      if (
        !Number.isFinite(coord.lat) || !Number.isFinite(coord.lng) ||
        coord.lat < 24 || coord.lat > 46 || coord.lng < 122 || coord.lng > 154
      ) {
        return badRequest("Coordinates must be finite numbers within Japan bounds (lat 24-46, lng 122-154)", undefined, {
          requestId: context.requestId,
        });
      }
    }

    // Validate and translate internal travel mode to routing mode
    if (!VALID_INTERNAL_MODES.has(payload.mode)) {
      return badRequest(`Invalid mode "${payload.mode}". Must be one of: ${Array.from(VALID_INTERNAL_MODES).join(", ")}`, undefined, {
        requestId: context.requestId,
      });
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
      return NextResponse.json(
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
      );
    } catch (error) {
      logger.error("Routing estimate error", error instanceof Error ? error : new Error(String(error)), {
        requestId: context.requestId,
        mode: payload.mode,
      });
      return internalError("Routing estimate unavailable", undefined, {
        requestId: context.requestId,
      });
    }
  },
  { rateLimit: RATE_LIMITS.ROUTING, requireJson: true, requireAuth: true },
);

