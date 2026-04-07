import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("stripe", () => {
  const mockCheckout = {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: "cs_test_123",
        payment_status: "paid",
        metadata: { tripId: "trip-1", userId: "user-1", tier: "standard" },
        amount_total: 2900,
      }),
    },
  };
  const mockCustomers = {
    create: vi.fn().mockResolvedValue({ id: "cus_test_123" }),
  };
  function MockStripe() {
    return { checkout: mockCheckout, customers: mockCustomers };
  }
  return { default: MockStripe };
});

// Mock server-only
vi.mock("server-only", () => ({}));

describe("billing/stripe", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_fake");
  });

  it("createCheckoutSession returns session URL and ID", async () => {
    const { createCheckoutSession } = await import("@/lib/billing/stripe");
    const result = await createCheckoutSession({
      tripId: "trip-1",
      userId: "user-1",
      tier: "standard",
      tripLengthDays: 7,
      cities: ["tokyo", "kyoto"],
      tripDates: "Apr 2 - Apr 8",
      stripeCustomerId: "cus_test_123",
      successUrl: "http://localhost:3000/itinerary?trip=trip-1&unlocked=1",
      cancelUrl: "http://localhost:3000/itinerary?trip=trip-1",
    });
    expect(result.url).toBeTruthy();
    expect(result.sessionId).toBe("cs_test_123");
  });

  it("verifySession returns payment status and metadata", async () => {
    const { verifySession } = await import("@/lib/billing/stripe");
    const result = await verifySession("cs_test_123");
    expect(result.paid).toBe(true);
    expect(result.metadata?.tripId).toBe("trip-1");
    expect(result.amountTotal).toBe(2900);
  });
});
