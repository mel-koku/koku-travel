import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireAuth,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getErrorMessage } from "@/lib/utils/errorUtils";

const uuidSchema = z.string().uuid("Invalid trip ID format");

const toggleSchema = z.object({
  isActive: z.boolean(),
}).strict();

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/trips/[id]/share
 *
 * Check the share status for a trip. Returns the active share record if one exists.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { id: tripId } = await params;

  // Rate limit
  const rateLimitResult = await checkRateLimit(request, { maxRequests: 100, windowMs: 60_000 });
  if (rateLimitResult) return rateLimitResult;

  // Auth
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  // Validate trip ID
  const parsed = uuidSchema.safeParse(tripId);
  if (!parsed.success) {
    return badRequest("Invalid trip ID format");
  }

  try {
    const supabase = getServiceRoleClient();

    const { data: share, error } = await supabase
      .from("trip_shares")
      .select("id, share_token, is_active, view_count, created_at, updated_at")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("Failed to fetch share status", new Error(error.message), {
        tripId,
        userId: user.id,
      });
      return internalError("Failed to check share status");
    }

    const response = NextResponse.json({
      share: share
        ? {
            id: share.id,
            shareToken: share.share_token,
            shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com"}/shared/${share.share_token}`,
            isActive: share.is_active,
            viewCount: share.view_count,
            createdAt: share.created_at,
          }
        : null,
    });
    return addRequestContextHeaders(response, authResult.context, request);
  } catch (error) {
    logger.error("Error checking share status", new Error(getErrorMessage(error)), {
      tripId,
    });
    return internalError("Failed to check share status");
  }
}

/**
 * POST /api/trips/[id]/share
 *
 * Create a share link for a trip. Idempotent — returns existing active share if one exists.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { id: tripId } = await params;

  // Rate limit
  const rateLimitResult = await checkRateLimit(request, { maxRequests: 30, windowMs: 60_000 });
  if (rateLimitResult) return rateLimitResult;

  // Auth
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  // Validate trip ID
  const parsed = uuidSchema.safeParse(tripId);
  if (!parsed.success) {
    return badRequest("Invalid trip ID format");
  }

  try {
    const supabase = getServiceRoleClient();

    // Verify user owns this trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError) {
      logger.error("Failed to verify trip ownership", new Error(tripError.message), {
        tripId,
        userId: user.id,
      });
      return internalError("Failed to create share link");
    }

    if (!trip) {
      return notFound("Trip not found");
    }

    // Check for existing active share (idempotent)
    const { data: existing } = await supabase
      .from("trip_shares")
      .select("id, share_token, is_active, view_count, created_at")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      const response = NextResponse.json({
        share: {
          id: existing.id,
          shareToken: existing.share_token,
          shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com"}/shared/${existing.share_token}`,
          isActive: true,
          viewCount: existing.view_count,
          createdAt: existing.created_at,
        },
      });
      return addRequestContextHeaders(response, authResult.context, request);
    }

    // Generate token: 128-bit entropy, URL-safe
    const shareToken = crypto.randomBytes(16).toString("base64url");

    const { data: share, error: insertError } = await supabase
      .from("trip_shares")
      .insert({
        trip_id: tripId,
        user_id: user.id,
        share_token: shareToken,
      })
      .select("id, share_token, is_active, view_count, created_at")
      .single();

    if (insertError) {
      logger.error("Failed to create share", new Error(insertError.message), {
        tripId,
        userId: user.id,
      });
      return internalError("Failed to create share link");
    }

    const response = NextResponse.json(
      {
        share: {
          id: share.id,
          shareToken: share.share_token,
          shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com"}/shared/${share.share_token}`,
          isActive: share.is_active,
          viewCount: share.view_count,
          createdAt: share.created_at,
        },
      },
      { status: 201 },
    );
    return addRequestContextHeaders(response, authResult.context, request);
  } catch (error) {
    logger.error("Error creating share", new Error(getErrorMessage(error)), {
      tripId,
    });
    return internalError("Failed to create share link");
  }
}

/**
 * PATCH /api/trips/[id]/share
 *
 * Toggle sharing on/off for a trip.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext(request);
  const { id: tripId } = await params;

  // Rate limit
  const rateLimitResult = await checkRateLimit(request, { maxRequests: 60, windowMs: 60_000 });
  if (rateLimitResult) return rateLimitResult;

  // Auth
  const authResult = await requireAuth(request, context);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  // Validate trip ID
  const parsed = uuidSchema.safeParse(tripId);
  if (!parsed.success) {
    return badRequest("Invalid trip ID format");
  }

  // Content-type check
  const contentTypeError = requireJsonContentType(request, context);
  if (contentTypeError) return contentTypeError;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const bodyResult = toggleSchema.safeParse(body);
  if (!bodyResult.success) {
    return badRequest("Invalid request body", bodyResult.error.flatten());
  }

  try {
    const supabase = getServiceRoleClient();

    const { data: share, error } = await supabase
      .from("trip_shares")
      .update({
        is_active: bodyResult.data.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .select("id, share_token, is_active, view_count, created_at, updated_at")
      .maybeSingle();

    if (error) {
      logger.error("Failed to toggle share", new Error(error.message), {
        tripId,
        userId: user.id,
      });
      return internalError("Failed to update share");
    }

    if (!share) {
      return notFound("Share not found for this trip");
    }

    const response = NextResponse.json({
      share: {
        id: share.id,
        shareToken: share.share_token,
        shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com"}/shared/${share.share_token}`,
        isActive: share.is_active,
        viewCount: share.view_count,
        createdAt: share.created_at,
      },
    });
    return addRequestContextHeaders(response, authResult.context, request);
  } catch (error) {
    logger.error("Error toggling share", new Error(getErrorMessage(error)), {
      tripId,
    });
    return internalError("Failed to update share");
  }
}
