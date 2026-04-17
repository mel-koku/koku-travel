import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/errors";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { validateRequestBody } from "@/lib/api/schemas";
import { z } from "zod";
import { findReplacementCandidates } from "@/lib/activityReplacement";

const replacementsRequestSchema = z.object({
  activity: z.object({
    kind: z.literal("place"),
  }).passthrough(),
  tripData: z.object({}).passthrough(),
  allActivities: z.array(z.unknown()).max(500),
  dayActivities: z.array(z.unknown()).max(100),
  currentDayIndex: z.number().int().min(0).max(30),
  maxCandidates: z.number().int().min(1).max(50).optional(),
});

/**
 * POST /api/itinerary/replacements
 * Finds replacement candidates for an activity.
 *
 * @throws Returns 400 if request body is invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export const POST = withApiHandler(
  async (request, { context }) => {
    const validation = await validateRequestBody(request, replacementsRequestSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", validation.error, {
        requestId: context.requestId,
      });
    }

    const {
      activity,
      tripData,
      allActivities,
      dayActivities,
      currentDayIndex,
      maxCandidates = 10,
    } = validation.data as z.infer<typeof replacementsRequestSchema> & {
      activity: Parameters<typeof findReplacementCandidates>[0];
      tripData: Parameters<typeof findReplacementCandidates>[1];
      allActivities: Parameters<typeof findReplacementCandidates>[2];
      dayActivities: Parameters<typeof findReplacementCandidates>[3];
    };

    // Short-circuit for custom activities (our scoring is catalog-based)
    const activityWithCustom = activity as { kind: string; isCustom?: boolean };
    if (activity.kind === "place" && activityWithCustom.isCustom) {
      return NextResponse.json(
        { data: { candidates: [], originalActivity: activity } },
        { status: 200 },
      );
    }

    // Find replacement candidates
    const result = await findReplacementCandidates(
      activity,
      tripData,
      allActivities,
      dayActivities,
      currentDayIndex,
      maxCandidates,
    );

    return NextResponse.json(
      { data: result },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      },
    );
  },
  { rateLimit: RATE_LIMITS.ITINERARY_REFINE, requireJson: true },
);
