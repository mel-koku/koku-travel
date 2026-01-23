import { NextRequest, NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  getOptionalAuth,
} from "@/lib/api/middleware";
import { badRequest, internalError } from "@/lib/api/errors";

/**
 * POST /api/routing/route
 * 
 * Gets full route details including path, instructions, and timing.
 * Returns complete route information for display.
 * 
 * @param request - Next.js request object
 * @param request.body - RoutingRequest with origin, destination, mode, etc.
 * @returns JSON object with route details
 * @throws Returns 400 if required fields are missing
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for other errors
 */
export async function POST(request: NextRequest) {
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Optional authentication (for future user-specific features)
  const authResult = await getOptionalAuth(request, context);
  const finalContext = authResult.context;

  let body: RoutingRequest;
  try {
    body = await request.json() as RoutingRequest;
  } catch {
    return addRequestContextHeaders(
      badRequest("Invalid JSON in request body.", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }
  
  // Validate required fields
  if (!body.origin || !body.destination || !body.mode) {
    return addRequestContextHeaders(
      badRequest("Missing required fields: origin, destination, mode", undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  // Validate mode
  const validModes = ["driving", "walking", "transit", "cycling"];
  if (!validModes.includes(body.mode)) {
    return addRequestContextHeaders(
      badRequest(`Invalid mode. Must be one of: ${validModes.join(", ")}`, undefined, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }
  
  try {
    // Request the route
    const result = await requestRoute(body);
    
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
    return addRequestContextHeaders(
      NextResponse.json({
        mode: result.mode,
        durationMinutes: Math.round(result.durationSeconds / 60),
        distanceMeters: result.distanceMeters,
        path: result.geometry,
        instructions: instructions.length > 0 ? instructions : undefined,
        arrivalTime,
        departureTime: body.departureTime,
        isEstimated,
      }),
      finalContext,
    );
  } catch (error) {
    logger.error("Routing route error", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      origin: body.origin,
      destination: body.destination,
      mode: body.mode,
    });
    return addRequestContextHeaders(
      internalError(
        error instanceof Error ? error.message : "Failed to get route",
        undefined,
        { requestId: finalContext.requestId },
      ),
      finalContext,
    );
  }
}

function parseTime(timeStr: string, timezone?: string): Date | null {
  try {
    // Try ISO string first
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      return new Date(timeStr);
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
      return date;
    }
    
    return new Date(timeStr);
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

