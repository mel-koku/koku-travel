import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { validateRequestBody } from "@/lib/api/schemas";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { fetchTripById } from "@/services/sync/tripSync";

const uuidSchema = z.string().uuid("Invalid trip ID format");

const planningWarningsPatchSchema = z
  .object({
    goshuinShown: z.boolean().optional(),
    coinTipShown: z.boolean().optional(),
  })
  .strip()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one warning field must be provided",
  });

/**
 * PATCH /api/trips/[id]/planning-warnings
 *
 * Updates trip-level planning warnings and one-time tip state.
 * Body: { goshuinShown?: boolean, coinTipShown?: boolean }
 * Response: { planningWarnings: Record<string, unknown> } — the merged state.
 *
 * @throws 400 for invalid trip id or malformed body
 * @throws 401 for unauthenticated
 * @throws 404 for trip not found OR owned by another user (RLS-enforced)
 * @throws 500 for server errors
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await props.params;
  return withApiHandler(
    async (req, { context, user }) => {
      const idValidation = uuidSchema.safeParse(tripId);
      if (!idValidation.success) {
        return badRequest("Invalid trip ID format", undefined, { requestId: context.requestId });
      }

      const validation = await validateRequestBody(req, planningWarningsPatchSchema, 1024);
      if (!validation.success) {
        return badRequest("Invalid request body", { errors: validation.error.issues }, {
          requestId: context.requestId,
        });
      }

      const supabase = await createClient();
      const existing = await fetchTripById(supabase, user!.id, tripId);
      if (!existing.success) {
        logger.error("Failed to fetch trip for planning-warnings update", new Error(existing.error), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to update planning warnings", undefined, {
          requestId: context.requestId,
        });
      }
      if (!existing.data) {
        return notFound("Trip not found", { requestId: context.requestId });
      }

      const merged: Record<string, unknown> = {
        ...(existing.data.planningWarnings ?? {}),
        ...validation.data,
      };

      const { error } = await supabase
        .from("trips")
        .update({ planning_warnings: merged })
        .eq("id", tripId)
        .eq("user_id", user!.id);

      if (error) {
        logger.error("Failed to write planning_warnings", new Error(error.message), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to update planning warnings", undefined, {
          requestId: context.requestId,
        });
      }

      return NextResponse.json({ planningWarnings: merged });
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}
