import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";
import { isUuid } from "@/lib/api/validation";
import { sendUnlockConfirmationEmail } from "@/lib/billing/email";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { badRequest, internalError } from "@/lib/api/errors";

export const maxDuration = 60;

export const POST = withApiHandler(async (request: NextRequest, { context }) => {
  const requestId = context.requestId;
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return badRequest("Missing stripe-signature", undefined, { requestId });
  }

  let event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    logger.error(
      "Stripe webhook signature verification failed",
      err instanceof Error ? err : new Error(String(err)),
      { requestId },
    );
    return badRequest("Invalid signature", undefined, { requestId });
  }

  const supabase = getServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { tripId, userId, tier } = session.metadata ?? {};
      if (!isUuid(tripId) || !isUuid(userId)) {
        logger.warn("Webhook metadata missing or malformed", {
          sessionId: session.id,
          hasTripId: !!tripId,
          hasUserId: !!userId,
          requestId,
        });
        break;
      }

      // Atomic: idempotency check + trip unlock + customer upsert + launch slot
      // decrement all happen in a single DB transaction via RPC.
      const { data: wasProcessed, error: rpcError } = await supabase.rpc(
        "process_webhook_event",
        {
          p_event_id: event.id,
          p_event_type: event.type,
          p_trip_id: tripId,
          p_user_id: userId,
          p_tier: tier,
          p_stripe_session_id: session.id,
          p_amount_cents: session.amount_total ?? 0,
          p_customer_id: session.customer ? String(session.customer) : null,
          p_launch_pricing: session.metadata?.launchPricing === "true",
        },
      );

      if (rpcError) {
        logger.error(
          "process_webhook_event RPC failed",
          rpcError instanceof Error ? rpcError : new Error(JSON.stringify(rpcError)),
          { eventId: event.id, tripId, requestId },
        );
        return internalError("Internal error", undefined, { requestId });
      }

      if (!wasProcessed) {
        logger.info("Webhook event already processed, skipping", {
          eventId: event.id,
          requestId,
        });
        break;
      }

      logger.info("Trip unlocked via webhook", { tripId, userId, tier, requestId });

      if (session.customer_details?.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yukujapan.com";
        const cities = (session.metadata?.cities ?? "").split(", ");
        try {
          await sendUnlockConfirmationEmail({
            to: session.customer_details.email,
            tripName: `${cities.join(", ")} Trip`,
            tripUrl: `${siteUrl}/signin?next=${encodeURIComponent(`/itinerary?trip=${tripId}`)}`,
            amountFormatted: `$${((session.amount_total ?? 0) / 100).toFixed(2)}`,
            tier: tier ?? "standard",
            cities,
            totalDays: parseInt(session.metadata?.tripLengthDays ?? "1", 10),
          });
          await supabase
            .from("trips")
            .update({
              unlock_email_sent_at: new Date().toISOString(),
              unlock_email_error: null,
            })
            .eq("id", tripId)
            .eq("user_id", userId);
        } catch (emailError) {
          const message = emailError instanceof Error ? emailError.message : String(emailError);
          logger.error(
            "Failed to send unlock confirmation email",
            emailError instanceof Error ? emailError : new Error(message),
            { tripId, userId, sessionId: session.id, requestId },
          );
          await supabase
            .from("trips")
            .update({
              unlock_email_sent_at: null,
              unlock_email_error: message.slice(0, 500),
            })
            .eq("id", tripId)
            .eq("user_id", userId);
        }
      }

      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object;
      logger.warn("Charge dispute received", {
        chargeId: String(dispute.charge),
        requestId,
      });
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      logger.warn("Charge refunded", { chargeId: charge.id, requestId });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
});
