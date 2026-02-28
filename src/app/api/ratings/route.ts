import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireAuth,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { validateRequestBody } from "@/lib/api/schemas";
import { badRequest, internalError } from "@/lib/api/errors";

const upsertRatingSchema = z.object({
  tripId: z.string().uuid(),
  dayId: z.string().min(1).max(100),
  activityId: z.string().min(1).max(200),
  locationId: z.string().max(255).nullish().transform((v) => v ?? undefined),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullish().transform((v) => v ?? undefined),
});

/**
 * POST /api/ratings
 * Upsert an activity rating (auth required).
 */
export async function POST(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return addRequestContextHeaders(rateLimitResponse, context);

  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) return addRequestContextHeaders(authResult, context);
  const { user, context: finalContext } = authResult;

  const validation = await validateRequestBody(request, upsertRatingSchema);
  if (!validation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid request body", { errors: validation.error.issues }, {
        requestId: finalContext.requestId,
      }),
      finalContext,
    );
  }

  const { tripId, dayId, activityId, locationId, rating, comment } = validation.data;

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("activity_ratings").upsert(
      {
        user_id: user.id,
        trip_id: tripId,
        day_id: dayId,
        activity_id: activityId,
        location_id: locationId ?? null,
        rating,
        comment: comment ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,trip_id,activity_id" },
    );

    if (error) {
      logger.error("Failed to upsert rating", new Error(error.message), {
        requestId: finalContext.requestId,
        userId: user.id,
      });
      return addRequestContextHeaders(
        internalError("Failed to save rating", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(NextResponse.json({ ok: true }), finalContext);
  } catch (error) {
    logger.error("Error saving rating", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
    });
    return addRequestContextHeaders(
      internalError("Failed to save rating", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}

/**
 * GET /api/ratings?trip_id=X
 * Fetch all ratings for a trip (auth required, scoped to user).
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return addRequestContextHeaders(rateLimitResponse, context);

  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) return addRequestContextHeaders(authResult, context);
  const { user, context: finalContext } = authResult;

  const tripId = request.nextUrl.searchParams.get("trip_id");
  if (!tripId) {
    return addRequestContextHeaders(
      badRequest("trip_id query parameter is required", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("activity_ratings")
      .select("activity_id, location_id, rating, comment")
      .eq("user_id", user.id)
      .eq("trip_id", tripId);

    if (error) {
      logger.error("Failed to fetch ratings", new Error(error.message), {
        requestId: finalContext.requestId,
        userId: user.id,
      });
      return addRequestContextHeaders(
        internalError("Failed to fetch ratings", undefined, { requestId: finalContext.requestId }),
        finalContext,
      );
    }

    return addRequestContextHeaders(
      NextResponse.json({ ratings: data ?? [] }),
      finalContext,
    );
  } catch (error) {
    logger.error("Error fetching ratings", error instanceof Error ? error : new Error(String(error)), {
      requestId: finalContext.requestId,
      userId: user.id,
    });
    return addRequestContextHeaders(
      internalError("Failed to fetch ratings", undefined, { requestId: finalContext.requestId }),
      finalContext,
    );
  }
}
