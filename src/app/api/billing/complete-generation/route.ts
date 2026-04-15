import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound, forbidden } from "@/lib/api/errors";
import { validateRequestBody } from "@/lib/api/schemas";
import { generateGuideProse } from "@/lib/server/guideProseGenerator";
import { generateDailyBriefings } from "@/lib/server/dailyBriefingGenerator";
import { extractTripIntent } from "@/lib/server/intentExtractor";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

export const maxDuration = 60;

const completeGenerationSchema = z.object({
  tripId: z.string().uuid(),
});

export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    if (!user) {
      return forbidden("Authentication required", { requestId: context.requestId });
    }

    const validation = await validateRequestBody(request, completeGenerationSchema);
    if (!validation.success) {
      return badRequest("Invalid request", {
        errors: validation.error.issues,
        requestId: context.requestId,
      });
    }
    const { tripId } = validation.data;

    const supabase = getServiceRoleClient();
    const { data: trip } = await supabase
      .from("trips")
      .select("itinerary, builder_data, unlocked_at, user_id")
      .eq("id", tripId)
      .eq("user_id", user.id)
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

    // Run the two Vertex passes in parallel but surface failures instead of masking.
    const [guideProseResult, briefingsResult] = await Promise.allSettled([
      generateGuideProse(itinerary, builderData, intentResult ?? undefined),
      generateDailyBriefings(itinerary, builderData),
    ]);

    if (guideProseResult.status === "rejected" || briefingsResult.status === "rejected") {
      const failureReason =
        guideProseResult.status === "rejected"
          ? guideProseResult.reason
          : (briefingsResult as PromiseRejectedResult).reason;
      logger.error(
        "Deferred generation failed",
        failureReason instanceof Error ? failureReason : new Error(String(failureReason)),
        {
          tripId,
          guideProseFailed: guideProseResult.status === "rejected",
          briefingsFailed: briefingsResult.status === "rejected",
          requestId: context.requestId,
        },
      );
      return NextResponse.json(
        { error: "Generation failed", retryable: true },
        { status: 502 },
      );
    }

    const guideProse = guideProseResult.value;
    const dailyBriefings = briefingsResult.value;

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
