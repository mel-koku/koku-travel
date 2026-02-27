import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createRequestContext, addRequestContextHeaders } from "@/lib/api/middleware";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getErrorMessage } from "@/lib/utils/errorUtils";

// base64url: 22 chars from 16 bytes
const tokenSchema = z.string().min(16).max(32).regex(/^[A-Za-z0-9_-]+$/);

type RouteParams = {
  params: Promise<{ token: string }>;
};

/**
 * GET /api/shared/[token]
 *
 * Public endpoint — no auth required.
 * Returns the trip data for a valid, active share token.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { token } = await params;

  // Rate limit — generous for public access
  const rateLimitResult = await checkRateLimit(request, { maxRequests: 60, windowMs: 60_000 });
  if (rateLimitResult) return rateLimitResult;

  // Validate token format
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return badRequest("Invalid share token format");
  }

  try {
    const supabase = getServiceRoleClient();

    // Look up active share
    const { data: share, error: shareError } = await supabase
      .from("trip_shares")
      .select("id, trip_id, view_count, created_at")
      .eq("share_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (shareError) {
      logger.error("Failed to fetch share", new Error(shareError.message), {
        token: token.substring(0, 6) + "...",
      });
      return internalError("Failed to load shared itinerary");
    }

    if (!share) {
      return notFound("This shared itinerary is no longer available");
    }

    // Fetch trip data (service role bypasses RLS)
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("name, itinerary, builder_data, created_at, updated_at")
      .eq("id", share.trip_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError) {
      logger.error("Failed to fetch shared trip", new Error(tripError.message), {
        tripId: share.trip_id,
      });
      return internalError("Failed to load shared itinerary");
    }

    if (!trip) {
      return notFound("This shared itinerary is no longer available");
    }

    // Increment view count (fire-and-forget)
    void Promise.resolve(
      supabase
        .from("trip_shares")
        .update({ view_count: share.view_count + 1 })
        .eq("id", share.id),
    )
      .then(({ error }) => {
        if (error) {
          logger.warn("Failed to increment view count", {
            shareId: share.id,
            error: error.message,
          });
        }
      })
      .catch((err: unknown) => {
        logger.warn("Unexpected error incrementing view count", {
          shareId: share.id,
          error: getErrorMessage(err),
        });
      });

    const response = NextResponse.json({
      trip: {
        name: trip.name,
        itinerary: trip.itinerary,
        builderData: trip.builder_data,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
      },
      share: {
        viewCount: share.view_count + 1,
        createdAt: share.created_at,
      },
    });

    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    return addRequestContextHeaders(response, context, request);
  } catch (error) {
    logger.error("Error loading shared itinerary", new Error(getErrorMessage(error)), {
      token: token.substring(0, 6) + "...",
    });
    return internalError("Failed to load shared itinerary");
  }
}
