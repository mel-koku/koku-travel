import { NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";
import { toRoutingMode, VALID_ROUTING_MODES } from "@/lib/routing/types";
import type { ItineraryTravelMode } from "@/types/itinerary";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";

/**
 * Valid internal travel modes that can be translated to routing modes.
 */
const VALID_INTERNAL_MODES = new Set<string>([
  "walk", "car", "taxi", "bicycle", "train", "subway", "bus", "tram", "ferry", "transit", "rideshare",
  // Also accept already-translated modes for flexibility
  "driving", "walking", "cycling",
]);

/**
 * POST /api/routing/route
 *
 * Gets full route details including path, instructions, and timing.
 * Returns complete route information for display.
 *
 * @throws Returns 400 if required fields are missing
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for other errors
 */
export const POST = withApiHandler(
  async (request, { context }) => {
    let body: RoutingRequest;
    try {
      body = await request.json() as RoutingRequest;
    } catch {
      return badRequest("Invalid JSON in request body.", undefined, {
        requestId: context.requestId,
      });
    }

    // Validate required fields
    if (!body.origin || !body.destination || !body.mode) {
      return badRequest("Missing required fields: origin, destination, mode", undefined, {
        requestId: context.requestId,
      });
    }

    // Validate and translate internal travel mode to routing mode
    if (!VALID_INTERNAL_MODES.has(body.mode)) {
      return badRequest(`Invalid mode "${body.mode}". Must be one of: ${Array.from(VALID_INTERNAL_MODES).join(", ")}`, undefined, {
        requestId: context.requestId,
      });
    }

    // Translate internal mode to routing API mode
    const routingMode = VALID_ROUTING_MODES.has(body.mode as "driving" | "walking" | "transit" | "cycling")
      ? body.mode as "driving" | "walking" | "transit" | "cycling"
      : toRoutingMode(body.mode as ItineraryTravelMode);

    try {
      // Request the route with translated mode
      const routingRequest: RoutingRequest = {
        ...body,
        mode: routingMode,
      };
      const result = await requestRoute(routingRequest);

      // Extract instructions from legs
      const instructions: string[] = [];
      result.legs.forEach((leg) => {
        leg.steps?.forEach((step) => {
          if (step.instruction) {
            instructions.push(step.instruction);
          }
        });
      });

      // Calculate arrival time if departure time is provided
      let arrivalTime: string | undefined;
      if (body.departureTime) {
        const departure = parseTime(body.departureTime, body.timezone);
        if (departure) {
          const arrival = new Date(departure.getTime() + result.durationSeconds * 1000);
          arrivalTime = formatTime(arrival, body.timezone);
        }
      }

      // "mock" provider indicates heuristic estimate (not from real routing API)
      const isEstimated = result.provider === "mock";

      // Return full route response
      return NextResponse.json({
        mode: result.mode,
        durationMinutes: Math.round(result.durationSeconds / 60),
        distanceMeters: result.distanceMeters,
        path: result.geometry,
        instructions: instructions.length > 0 ? instructions : undefined,
        arrivalTime,
        departureTime: body.departureTime,
        isEstimated,
      });
    } catch (error) {
      logger.error("Routing route error", error instanceof Error ? error : new Error(String(error)), {
        requestId: context.requestId,
        origin: body.origin,
        destination: body.destination,
        mode: body.mode,
      });
      throw error;
    }
  },
  { rateLimit: RATE_LIMITS.ROUTING, requireJson: true },
);

function parseTime(timeStr: string, timezone?: string): Date | null {
  try {
    // Try ISO string first
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      const date = new Date(timeStr);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try HH:MM format - assume today in the timezone
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match && match[1] && match[2]) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const now = timezone
        ? new Date(new Date().toLocaleString("en-US", { timeZone: timezone }))
        : new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatTime(date: Date, timezone?: string): string {
  if (timezone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return formatter.format(date);
  }

  // Format as HH:MM in local time
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

