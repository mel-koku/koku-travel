import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";
import { verifySession } from "@/lib/billing/stripe";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export const GET = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    const tripId = request.nextUrl.searchParams.get("trip_id");

    if (!sessionId || !tripId) {
      return badRequest("Missing session_id or trip_id", { requestId: context.requestId });
    }

    const result = await verifySession(sessionId);

    if (result.paid && result.metadata?.tripId === tripId && result.metadata?.userId === user?.id) {
      const supabase = getServiceRoleClient();
      const { data: trip } = await supabase
        .from("trips")
        .select("unlocked_at")
        .eq("id", tripId)
        .single();

      if (!trip?.unlocked_at) {
        await supabase
          .from("trips")
          .update({
            unlocked_at: new Date().toISOString(),
            unlock_tier: result.metadata.tier,
            stripe_session_id: sessionId,
            unlock_amount_cents: result.amountTotal,
          })
          .eq("id", tripId)
          .eq("user_id", user!.id);

        logger.info("Trip unlocked via verify fallback", { tripId, sessionId });
      }

      return NextResponse.json({ unlocked: true, tier: result.metadata.tier });
    }

    return NextResponse.json({ unlocked: false });
  },
  { rateLimit: RATE_LIMITS.BILLING_VERIFY, requireAuth: true },
);
