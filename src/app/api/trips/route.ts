import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireAuth,
} from "@/lib/api/middleware";
import { validateRequestBody } from "@/lib/api/schemas";
import { badRequest, internalError } from "@/lib/api/errors";
import { fetchTrips, saveTrip } from "@/services/sync/tripSync";
import type { StoredTrip } from "@/services/trip/types";

/**
 * Schema for creating a new trip
 */
const createTripSchema = z.object({
  id: z.string().uuid().optional(), // Allow client-generated UUID
  name: z.string().min(1).max(500).default("Untitled itinerary"),
  itinerary: z.object({
    days: z.array(z.any()).default([]),
  }).passthrough().default({ days: [] }),
  builderData: z.record(z.any()).default({}),
});

/**
 * GET /api/trips
 *
 * Lists all trips for the authenticated user.
 *
 * Response:
 * {
 *   trips: StoredTrip[],
 *   count: number
 * }
 *
 * @throws Returns 401 if not authenticated
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  // Rate limiting: 100 requests per minute
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Require authentication
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) {
    return addRequestContextHeaders(authResult, context);
  }

  const { user, context: finalContext } = authResult;

  try {
    const supabase = await createClient();
    const result = await fetchTrips(supabase, user.id);

    if (!result.success) {
      logger.error("Failed to fetch trips", new Error(result.error), {
        requestId: finalContext.requestId,
        userId: user.id,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch trips", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({
        trips: result.data,
        count: result.data?.length ?? 0,
      }),
      finalContext,
    );
  } catch (error) {
    logger.error("Error fetching trips", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
    });
    return addRequestContextHeaders(
      internalError("Failed to fetch trips", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}

/**
 * POST /api/trips
 *
 * Creates a new trip for the authenticated user.
 *
 * Request body:
 * {
 *   id?: string (UUID, optional - will be generated if not provided),
 *   name?: string (default: "Untitled itinerary"),
 *   itinerary?: { days: ItineraryDay[] } (default: { days: [] }),
 *   builderData?: TripBuilderData (default: {})
 * }
 *
 * Response:
 * {
 *   trip: StoredTrip
 * }
 *
 * @throws Returns 400 if request body is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  const context = createRequestContext(request);

  // Rate limiting: 30 requests per minute (creating trips is more expensive)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Require authentication
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) {
    return addRequestContextHeaders(authResult, context);
  }

  const { user, context: finalContext } = authResult;

  // Validate request body (2MB max for itinerary data)
  const validation = await validateRequestBody(request, createTripSchema, 2 * 1024 * 1024);
  if (!validation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid request body", {
        errors: validation.error.issues,
      }, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  const { id, name, itinerary, builderData } = validation.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Create the trip object
    const trip: StoredTrip = {
      id: id ?? crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      itinerary,
      builderData,
    };

    const result = await saveTrip(supabase, user.id, trip);

    if (!result.success) {
      logger.error("Failed to create trip", new Error(result.error), {
        requestId: finalContext.requestId,
        userId: user.id,
      });
      return addRequestContextHeaders(
        internalError("Failed to create trip", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({ trip: result.data }, { status: 201 }),
      finalContext,
    );
  } catch (error) {
    logger.error("Error creating trip", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
    });
    return addRequestContextHeaders(
      internalError("Failed to create trip", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}
