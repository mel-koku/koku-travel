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
import { reserveCost, reconcileCost, costLimitResponse } from "@/lib/api/costLimit";
import { estimateInputTokens } from "@/lib/api/tokenEstimate";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

const GENERATION_MODEL_ID = "gemini-2.5-flash";

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

    // Cost reservation: estimate input as serialised trip JSON, cap output per call.
    // guide prose = N days + 1 header; briefings = N days. Conservative: 2*N+1 calls.
    const days = (itinerary.days ?? []).length;
    const numCalls = 2 * days + 1;
    const inputText = JSON.stringify({ itinerary, builderData });
    const inputTokensPerCall = estimateInputTokens(inputText);
    const inputTokens = inputTokensPerCall * numCalls;
    const maxOutputTokens = 512 * numCalls; // per-call cap × number of calls

    const costKey = user.id;
    const reservation = await reserveCost({
      key: costKey,
      model: GENERATION_MODEL_ID,
      inputTokens,
      maxOutputTokens,
    });
    if (!reservation.allowed) {
      logger.warn("complete-generation blocked by cost limit", {
        scope: reservation.scope,
        usedCents: reservation.usedCents,
        limitCents: reservation.limitCents,
        requestId: context.requestId,
      });
      return costLimitResponse(reservation) as unknown as NextResponse;
    }

    // Accumulate real token counts + grounded-request count across all Vertex
    // calls. Grounded calls bill $0.035/request on top of tokens — only the
    // briefings pass uses grounding (when ENABLE_BRIEFING_GROUNDING is on),
    // and only when the model actually invokes the tool.
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let groundedRequestCount = 0;
    const onUsage = (u: {
      promptTokens: number;
      completionTokens: number;
      grounded?: boolean;
    }): void => {
      totalPromptTokens += u.promptTokens;
      totalCompletionTokens += u.completionTokens;
      if (u.grounded) groundedRequestCount += 1;
    };

    // Run intent extraction first (needed by guide prose)
    const intentResult = await extractTripIntent(builderData).catch(() => null);

    // Run the two Vertex passes in parallel but surface failures instead of masking.
    const [guideProseResult, briefingsResult] = await Promise.allSettled([
      generateGuideProse(itinerary, builderData, intentResult ?? undefined, { onUsage }),
      generateDailyBriefings(itinerary, builderData, { onUsage }),
    ]);

    // Reconcile real cost (fires async, best-effort).
    reconcileCost(reservation.reservationId, {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      groundedRequestCount,
    }).catch((err) => {
      logger.warn("complete-generation reconcileCost failed", {
        requestId: context.requestId,
        error: String(err),
      });
    });

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
