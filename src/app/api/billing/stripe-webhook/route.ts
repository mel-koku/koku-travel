import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    logger.error(
      "Stripe webhook signature verification failed",
      err instanceof Error ? err : new Error(String(err)),
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { tripId, userId, tier } = session.metadata ?? {};
      if (!tripId || !userId) {
        logger.warn("Webhook missing metadata", { sessionId: session.id });
        break;
      }

      await supabase
        .from("trips")
        .update({
          unlocked_at: new Date().toISOString(),
          unlock_tier: tier,
          stripe_session_id: session.id,
          unlock_amount_cents: session.amount_total,
        })
        .eq("id", tripId)
        .eq("user_id", userId);

      if (session.customer) {
        await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: String(session.customer),
            },
            { onConflict: "user_id" },
          );
      }

      if (session.metadata?.launchPricing === "true") {
        await supabase.rpc("decrement_launch_slots");
      }

      logger.info("Trip unlocked via webhook", { tripId, userId, tier });
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object;
      logger.warn("Charge dispute received", { chargeId: String(dispute.charge) });
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      logger.warn("Charge refunded", { chargeId: charge.id });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
