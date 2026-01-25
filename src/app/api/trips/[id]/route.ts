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
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { fetchTripById, saveTrip, deleteTrip } from "@/services/sync/tripSync";
import type { StoredTrip } from "@/services/trip/types";

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid("Invalid trip ID format");

/**
 * Schema for updating a trip (partial update)
 */
const updateTripSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  itinerary: z.object({
    days: z.array(z.any()),
  }).passthrough().optional(),
  builderData: z.record(z.any()).optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/trips/[id]
 *
 * Gets a single trip by ID for the authenticated user.
 *
 * Response:
 * {
 *   trip: StoredTrip
 * }
 *
 * @throws Returns 400 if trip ID is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 404 if trip not found
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { id: tripId } = await params;

  // Rate limiting: 100 requests per minute
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Validate trip ID format
  const idValidation = uuidSchema.safeParse(tripId);
  if (!idValidation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid trip ID format", undefined, { requestId: context.requestId }),
      context,
    );
  }

  // Require authentication
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) {
    return addRequestContextHeaders(authResult, context);
  }

  const { user, context: finalContext } = authResult;

  try {
    const supabase = await createClient();
    const result = await fetchTripById(supabase, user.id, tripId);

    if (!result.success) {
      logger.error("Failed to fetch trip", new Error(result.error), {
        requestId: finalContext.requestId,
        userId: user.id,
        tripId,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch trip", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    if (!result.data) {
      return addRequestContextHeaders(
        notFound("Trip not found", { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({ trip: result.data }),
      finalContext,
    );
  } catch (error) {
    logger.error("Error fetching trip", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
      tripId,
    });
    return addRequestContextHeaders(
      internalError("Failed to fetch trip", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}

/**
 * PATCH /api/trips/[id]
 *
 * Updates a trip for the authenticated user.
 *
 * Request body (all fields optional):
 * {
 *   name?: string,
 *   itinerary?: { days: ItineraryDay[] },
 *   builderData?: TripBuilderData
 * }
 *
 * Response:
 * {
 *   trip: StoredTrip
 * }
 *
 * @throws Returns 400 if request body is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 404 if trip not found
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { id: tripId } = await params;

  // Rate limiting: 60 requests per minute
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Validate trip ID format
  const idValidation = uuidSchema.safeParse(tripId);
  if (!idValidation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid trip ID format", undefined, { requestId: context.requestId }),
      context,
    );
  }

  // Require authentication
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) {
    return addRequestContextHeaders(authResult, context);
  }

  const { user, context: finalContext } = authResult;

  // Validate request body (2MB max)
  const validation = await validateRequestBody(request, updateTripSchema, 2 * 1024 * 1024);
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

  const updates = validation.data;

  // Check if there are any updates
  if (!updates.name && !updates.itinerary && !updates.builderData) {
    return addRequestContextHeaders(
      badRequest("No updates provided", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }

  try {
    const supabase = await createClient();

    // First fetch the existing trip
    const existingResult = await fetchTripById(supabase, user.id, tripId);

    if (!existingResult.success) {
      logger.error("Failed to fetch trip for update", new Error(existingResult.error), {
        requestId: finalContext.requestId,
        userId: user.id,
        tripId,
      });
      return addRequestContextHeaders(
        internalError("Failed to update trip", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    if (!existingResult.data) {
      return addRequestContextHeaders(
        notFound("Trip not found", { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    // Merge updates with existing trip
    const updatedTrip: StoredTrip = {
      ...existingResult.data,
      name: updates.name ?? existingResult.data.name,
      itinerary: updates.itinerary ?? existingResult.data.itinerary,
      builderData: updates.builderData ?? existingResult.data.builderData,
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await saveTrip(supabase, user.id, updatedTrip);

    if (!saveResult.success) {
      logger.error("Failed to save trip update", new Error(saveResult.error), {
        requestId: finalContext.requestId,
        userId: user.id,
        tripId,
      });
      return addRequestContextHeaders(
        internalError("Failed to update trip", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({ trip: saveResult.data }),
      finalContext,
    );
  } catch (error) {
    logger.error("Error updating trip", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
      tripId,
    });
    return addRequestContextHeaders(
      internalError("Failed to update trip", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}

/**
 * DELETE /api/trips/[id]
 *
 * Soft deletes a trip for the authenticated user.
 * Sets the deleted_at timestamp rather than permanently removing the record.
 *
 * Response:
 * {
 *   success: true
 * }
 *
 * @throws Returns 400 if trip ID is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { id: tripId } = await params;

  // Rate limiting: 30 requests per minute
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Validate trip ID format
  const idValidation = uuidSchema.safeParse(tripId);
  if (!idValidation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid trip ID format", undefined, { requestId: context.requestId }),
      context,
    );
  }

  // Require authentication
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) {
    return addRequestContextHeaders(authResult, context);
  }

  const { user, context: finalContext } = authResult;

  try {
    const supabase = await createClient();
    const result = await deleteTrip(supabase, user.id, tripId);

    if (!result.success) {
      logger.error("Failed to delete trip", new Error(result.error), {
        requestId: finalContext.requestId,
        userId: user.id,
        tripId,
      });
      return addRequestContextHeaders(
        internalError("Failed to delete trip", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({ success: true }),
      finalContext,
    );
  } catch (error) {
    logger.error("Error deleting trip", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
      tripId,
    });
    return addRequestContextHeaders(
      internalError("Failed to delete trip", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}
