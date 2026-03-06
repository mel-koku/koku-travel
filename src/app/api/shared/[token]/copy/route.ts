import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";

const tokenSchema = z.string().min(16).max(32).regex(/^[A-Za-z0-9_-]+$/);

/**
 * POST /api/shared/[token]/copy
 *
 * Auth required. Creates a copy of the shared trip for the authenticated user.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  const { token } = await props.params;
  return withApiHandler(
    async (_req, { user }) => {
      // Validate token format
      const parsed = tokenSchema.safeParse(token);
      if (!parsed.success) {
        return badRequest("Invalid share token format");
      }

      const supabase = getServiceRoleClient();

      // Look up active share
      const { data: share, error: shareError } = await supabase
        .from("trip_shares")
        .select("id, trip_id")
        .eq("share_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (shareError) {
        logger.error("Failed to fetch share for copy", new Error(shareError.message));
        return internalError("Failed to load shared itinerary");
      }

      if (!share) {
        return notFound("This shared itinerary is no longer available");
      }

      // Fetch source trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("name, itinerary, builder_data")
        .eq("id", share.trip_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (tripError || !trip) {
        return notFound("This shared itinerary is no longer available");
      }

      // Create new trip for authenticated user
      const newTripId = uuidv4();
      const { error: insertError } = await supabase
        .from("trips")
        .insert({
          id: newTripId,
          user_id: user!.id,
          name: `${trip.name} (copy)`,
          itinerary: trip.itinerary,
          builder_data: trip.builder_data,
        });

      if (insertError) {
        logger.error("Failed to create trip copy", new Error(insertError.message));
        return internalError("Failed to save trip copy");
      }

      return NextResponse.json({ tripId: newTripId }, { status: 201 });
    },
    { rateLimit: RATE_LIMITS.SHARED, requireAuth: true },
  )(request);
}
