import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/** Hash a share token for safe logging (no partial token leakage). */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").substring(0, 8);
}

// base64url: 22 chars from 16 bytes
const tokenSchema = z.string().min(16).max(32).regex(/^[A-Za-z0-9_-]+$/);

/**
 * GET /api/shared/[token]
 *
 * Public endpoint — no auth required.
 * Returns the trip data for a valid, active share token.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  const { token } = await props.params;
  return withApiHandler(
    async () => {
      // Validate token format
      const parsed = tokenSchema.safeParse(token);
      if (!parsed.success) {
        return badRequest("Invalid share token format");
      }

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
          tokenHash: hashToken(token),
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
        "private, no-store",
      );

      return response;
    },
    { rateLimit: RATE_LIMITS.SHARED },
  )(request);
}
