import "server-only";
import Stripe from "stripe";
import { TIER_PRICES, type UnlockTier } from "./types";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

type CreateCheckoutParams = {
  tripId: string;
  userId: string;
  tier: UnlockTier;
  tripLengthDays: number;
  cities: string[];
  tripDates: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
  launchPricing?: boolean;
  launchPriceCents?: number;
};

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const stripe = getStripeClient();
  const priceCents =
    params.launchPricing && params.launchPriceCents
      ? params.launchPriceCents
      : TIER_PRICES[params.tier];

  const citiesLabel = params.cities
    .slice(0, 5)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(", ");

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: params.stripeCustomerId || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceCents,
            product_data: {
              name: "Yuku Trip Pass",
              description: `Your ${params.tripLengthDays}-day journey across ${citiesLabel}. ${params.tripDates}.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tripId: params.tripId,
        userId: params.userId,
        tripLengthDays: String(params.tripLengthDays),
        tier: params.tier,
        launchPricing: String(params.launchPricing ?? false),
        cities: citiesLabel.slice(0, 100),
      },
      client_reference_id: `unlock-${params.tripId}-${params.userId}`,
      success_url: params.successUrl + "&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: params.cancelUrl,
      automatic_tax: { enabled: true },
    },
    {
      idempotencyKey: `unlock-${params.tripId}-${params.userId}`,
    },
  );

  return { sessionId: session.id, url: session.url };
}

export async function verifySession(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === "paid",
    metadata: session.metadata as Record<string, string> | null,
    amountTotal: session.amount_total,
  };
}

export async function constructWebhookEvent(
  body: string,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return stripe.webhooks.constructEvent(body, signature, secret);
}

export async function createCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    metadata: { supabaseUserId: userId },
  });
  return customer.id;
}
