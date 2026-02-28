import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createRequestContext, addRequestContextHeaders } from "@/lib/api/middleware";
import { badRequest, notFound, internalError, unauthorized } from "@/lib/api/errors";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/errorUtils";

const tokenSchema = z.string().min(16).max(32).regex(/^[A-Za-z0-9_-]+$/);

type RouteParams = {
  params: Promise<{ token: string }>;
};

/**
 * POST /api/shared/[token]/copy
 *
 * Auth required. Creates a copy of the shared trip for the authenticated user.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { token } = await params;

  // Rate limit — 10/hr
  const rateLimitResult = await checkRateLimit(request, { maxRequests: 10, windowMs: 3_600_000 });
  if (rateLimitResult) return rateLimitResult;

  // Validate token format
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return badRequest("Invalid share token format");
  }

  // Auth check
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return unauthorized("Sign in to save a copy of this trip");
  }

  try {
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
        user_id: user.id,
        name: `${trip.name} (copy)`,
        itinerary: trip.itinerary,
        builder_data: trip.builder_data,
      });

    if (insertError) {
      logger.error("Failed to create trip copy", new Error(insertError.message));
      return internalError("Failed to save trip copy");
    }

    const response = NextResponse.json({ tripId: newTripId }, { status: 201 });
    return addRequestContextHeaders(response, context, request);
  } catch (error) {
    logger.error("Error copying shared trip", new Error(getErrorMessage(error)));
    return internalError("Failed to save trip copy");
  }
}
