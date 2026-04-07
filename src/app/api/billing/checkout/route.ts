import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, forbidden } from "@/lib/api/errors";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { getTripTier } from "@/lib/billing/access";
import { isFullAccessEnabled } from "@/lib/billing/accessServer";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validateRequestBody } from "@/lib/api/schemas";

export const maxDuration = 60;

const checkoutSchema = z.object({
  tripId: z.string().min(1),
  tripLengthDays: z.number().int().min(1),
  cities: z.array(z.string()).min(1),
  tripDates: z.string().min(1),
});

export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    if (!user) {
      return forbidden("Sign in to unlock your trip.", { requestId: context.requestId });
    }

    if (await isFullAccessEnabled()) {
      return badRequest("Full access is currently enabled. No purchase needed.", {
        requestId: context.requestId,
      });
    }

    const validation = await validateRequestBody(request, checkoutSchema);
    if (!validation.success) {
      return badRequest("Invalid request", {
        errors: validation.error.issues,
        requestId: context.requestId,
      });
    }

    const { tripId, tripLengthDays, cities, tripDates } = validation.data;
    const tier = getTripTier(tripLengthDays);

    const supabase = await createClient();
    const { data: trip } = await supabase
      .from("trips")
      .select("unlocked_at")
      .eq("id", tripId)
      .eq("user_id", user.id)
      .single();

    if (trip?.unlocked_at) {
      return badRequest("This trip is already unlocked.", {
        requestId: context.requestId,
      });
    }

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const stripeCustomerId = prefs?.stripe_customer_id;

    const { data: launchData } = await supabase
      .from("launch_pricing")
      .select("remaining_slots")
      .eq("id", "default")
      .single();

    const launchPricing = (launchData?.remaining_slots ?? 0) > 0;
    const launchPriceCents = 1900;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const result = await createCheckoutSession({
      tripId,
      userId: user.id,
      tier,
      tripLengthDays,
      cities,
      tripDates,
      stripeCustomerId: stripeCustomerId ?? undefined,
      successUrl: `${siteUrl}/itinerary?trip=${tripId}&unlocked=1`,
      cancelUrl: `${siteUrl}/itinerary?trip=${tripId}`,
      launchPricing,
      launchPriceCents: launchPricing ? launchPriceCents : undefined,
    });

    return NextResponse.json({
      checkoutUrl: result.url,
      sessionId: result.sessionId,
      tier,
      launchPricing,
    });
  },
  { rateLimit: RATE_LIMITS.BILLING_CHECKOUT, requireAuth: true, requireJson: true },
);
