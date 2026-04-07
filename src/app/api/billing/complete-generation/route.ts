import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound, forbidden } from "@/lib/api/errors";
import { generateGuideProse } from "@/lib/server/guideProseGenerator";
import { generateDailyBriefings } from "@/lib/server/dailyBriefingGenerator";
import { extractTripIntent } from "@/lib/server/intentExtractor";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

export const maxDuration = 60;

export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    if (!user) {
      return forbidden("Authentication required", { requestId: context.requestId });
    }

    const body = await request.json();
    const tripId = body.tripId;
    if (!tripId) {
      return badRequest("Missing tripId", { requestId: context.requestId });
    }

    const supabase = getServiceRoleClient();
    const { data: trip } = await supabase
      .from("trips")
      .select("itinerary, builder_data, unlocked_at")
      .eq("id", tripId)
      .single();

    if (!trip) {
      return notFound("Trip not found", { requestId: context.requestId });
    }

    if (!trip.unlocked_at) {
      return forbidden("Trip is not unlocked", { requestId: context.requestId });
    }

    const itinerary = trip.itinerary as Itinerary;
    const builderData = trip.builder_data as TripBuilderData;

    // Run intent extraction first (needed by guide prose)
    const intentResult = await extractTripIntent(builderData).catch(() => null);

    // Run deferred Gemini passes in parallel
    const [guideProse, dailyBriefings] = await Promise.all([
      generateGuideProse(itinerary, builderData, intentResult ?? undefined).catch(() => null),
      generateDailyBriefings(itinerary, builderData).catch(() => null),
    ]);

    const dayIntros = guideProse
      ? Object.fromEntries(guideProse.days.map((d) => [d.dayId, d.intro]))
      : null;

    logger.info("Deferred generation completed", {
      tripId,
      hasGuideProse: !!guideProse,
      hasDailyBriefings: !!dailyBriefings,
      requestId: context.requestId,
    });

    return NextResponse.json({
      guideProse,
      dailyBriefings,
      dayIntros,
    });
  },
  { rateLimit: RATE_LIMITS.BILLING_COMPLETE, requireAuth: true, requireJson: true },
);
