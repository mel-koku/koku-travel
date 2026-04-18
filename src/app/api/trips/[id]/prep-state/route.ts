import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { validateRequestBody } from "@/lib/api/schemas";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { fetchTripById } from "@/services/sync/tripSync";
import { isPrepItemId } from "@/data/prepChecklist";

const uuidSchema = z.string().uuid("Invalid trip ID format");

const prepStatePatchSchema = z.object({
  itemId: z.string().min(1).max(100),
  checked: z.boolean(),
}).strip();

/**
 * PATCH /api/trips/[id]/prep-state
 *
 * Toggles one checklist item for one trip. Body: { itemId, checked }.
 * Response: { prepState: Record<string, boolean> } — the merged state.
 *
 * @throws 400 for invalid trip id, unknown itemId, or malformed body
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

      const validation = await validateRequestBody(req, prepStatePatchSchema, 1024);
      if (!validation.success) {
        return badRequest("Invalid request body", { errors: validation.error.issues }, { requestId: context.requestId });
      }

      const { itemId, checked } = validation.data;
      if (!isPrepItemId(itemId)) {
        return badRequest("Unknown prep item", { itemId }, { requestId: context.requestId });
      }

      const supabase = await createClient();
      const existing = await fetchTripById(supabase, user!.id, tripId);
      if (!existing.success) {
        logger.error("Failed to fetch trip for prep-state update", new Error(existing.error), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to update prep state", undefined, { requestId: context.requestId });
      }
      if (!existing.data) {
        return notFound("Trip not found", { requestId: context.requestId });
      }

      const merged: Record<string, boolean> = { ...(existing.data.prepState ?? {}), [itemId]: checked };

      const { error } = await supabase
        .from("trips")
        .update({ prep_state: merged })
        .eq("id", tripId)
        .eq("user_id", user!.id);

      if (error) {
        logger.error("Failed to write prep_state", new Error(error.message), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to update prep state", undefined, { requestId: context.requestId });
      }

      return NextResponse.json({ prepState: merged });
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}
