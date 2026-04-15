import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

const mockConstructEvent = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/lib/supabase/serviceRole", () => ({
  getServiceRoleClient: () => mockSupabase,
}));
vi.mock("@/lib/billing/stripe", () => ({
  constructWebhookEvent: (...args: unknown[]) => mockConstructEvent(...args),
}));
vi.mock("@/lib/billing/email", () => ({
  sendUnlockConfirmationEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const TRIP_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

function buildEvent(overrides = {}) {
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        amount_total: 1900,
        customer: "cus_test_1",
        customer_details: { email: "buyer@example.com" },
        metadata: {
          tripId: TRIP_ID,
          userId: USER_ID,
          tier: "short",
          launchPricing: "false",
          cities: "Tokyo",
          tripLengthDays: "5",
        },
        ...overrides,
      },
    },
  };
}

function buildRequest() {
  return new NextRequest("https://example.com/api/billing/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=fake" },
    body: "{}",
  });
}

function installTableMocks(opts: {
  eventInsertConflict?: boolean;
  emailSendSucceeds?: boolean;
}) {
  const eventInsert = vi.fn(() =>
    Promise.resolve({
      data: opts.eventInsertConflict ? null : { event_id: "evt_test_1" },
      error: null,
    }),
  );
  const tripsUpdate = vi.fn(() => ({
    eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }));
  const prefsUpsert = vi.fn(() => Promise.resolve({ error: null }));

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "billing_webhook_events") {
      return {
        insert: () => ({
          select: () => ({ maybeSingle: eventInsert }),
        }),
      };
    }
    if (table === "trips") return { update: tripsUpdate };
    if (table === "user_preferences") return { upsert: prefsUpsert };
    throw new Error(`unexpected table ${table}`);
  });

  mockSendEmail.mockImplementation(() =>
    opts.emailSendSucceeds === false
      ? Promise.reject(new Error("Resend down"))
      : Promise.resolve({ id: "resend_1" }),
  );

  return { eventInsert, tripsUpdate, prefsUpsert };
}

describe("stripe-webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a new event once (inserts event row, updates trip, sends email)", async () => {
    const mocks = installTableMocks({ emailSendSucceeds: true });
    mockConstructEvent.mockResolvedValue(buildEvent());
    const { POST } = await import("@/app/api/billing/stripe-webhook/route");
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(mocks.eventInsert).toHaveBeenCalledTimes(1);
    expect(mocks.tripsUpdate).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("short-circuits on duplicate event id (no trip update, no email)", async () => {
    const mocks = installTableMocks({ eventInsertConflict: true });
    mockConstructEvent.mockResolvedValue(buildEvent());
    const { POST } = await import("@/app/api/billing/stripe-webhook/route");
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(mocks.tripsUpdate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("records unlock_email_error on Resend failure but still returns 200", async () => {
    const mocks = installTableMocks({ emailSendSucceeds: false });
    mockConstructEvent.mockResolvedValue(buildEvent());
    const { POST } = await import("@/app/api/billing/stripe-webhook/route");
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(mocks.tripsUpdate).toHaveBeenCalledTimes(2);
    const secondCall = mocks.tripsUpdate.mock.calls[1][0];
    expect(secondCall).toHaveProperty("unlock_email_error");
    expect(secondCall.unlock_email_sent_at).toBeNull();
  });

  it("records unlock_email_sent_at on Resend success", async () => {
    const mocks = installTableMocks({ emailSendSucceeds: true });
    mockConstructEvent.mockResolvedValue(buildEvent());
    const { POST } = await import("@/app/api/billing/stripe-webhook/route");
    await POST(buildRequest());
    const secondCall = mocks.tripsUpdate.mock.calls[1][0];
    expect(secondCall.unlock_email_sent_at).toBeTruthy();
    expect(secondCall.unlock_email_error).toBeNull();
  });
});
