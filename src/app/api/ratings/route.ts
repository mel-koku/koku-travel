import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
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
export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    const validation = await validateRequestBody(request, upsertRatingSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", { errors: validation.error.issues }, {
        requestId: context.requestId,
      });
    }

    const { tripId, dayId, activityId, locationId, rating, comment } = validation.data;

    const supabase = await createClient();

    const { error } = await supabase.from("activity_ratings").upsert(
      {
        user_id: user!.id,
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
        requestId: context.requestId,
        userId: user!.id,
      });
      return internalError("Failed to save rating", undefined, { requestId: context.requestId });
    }

    return NextResponse.json({ ok: true });
  },
  { rateLimit: RATE_LIMITS.RATINGS, requireAuth: true, requireJson: true },
);

/**
 * GET /api/ratings?trip_id=X
 * Fetch all ratings for a trip (auth required, scoped to user).
 */
export const GET = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    const tripId = request.nextUrl.searchParams.get("trip_id");
    if (!tripId) {
      return badRequest("trip_id query parameter is required", undefined, { requestId: context.requestId });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("activity_ratings")
      .select("activity_id, location_id, rating, comment")
      .eq("user_id", user!.id)
      .eq("trip_id", tripId);

    if (error) {
      logger.error("Failed to fetch ratings", new Error(error.message), {
        requestId: context.requestId,
        userId: user!.id,
      });
      return internalError("Failed to fetch ratings", undefined, { requestId: context.requestId });
    }

    return NextResponse.json({ ratings: data ?? [] });
  },
  { rateLimit: RATE_LIMITS.RATINGS, requireAuth: true },
);
