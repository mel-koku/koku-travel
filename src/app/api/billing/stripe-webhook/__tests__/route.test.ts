import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/billing/stripe", () => ({
  constructWebhookEvent: vi.fn(),
}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  getServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/billing/email", () => ({
  sendUnlockConfirmationEmail: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "../route";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sendUnlockConfirmationEmail } from "@/lib/billing/email";
import { logger } from "@/lib/logger";

function makeRequest() {
  return new NextRequest("http://localhost/api/billing/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  });
}

const GOOD_UUID_1 = "550e8400-e29b-41d4-a716-446655440000";
const GOOD_UUID_2 = "660e8400-e29b-41d4-a716-446655440001";

function makeCheckoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_session",
        amount_total: 1900,
        customer: "cus_test_123",
        customer_details: { email: "test@example.com" },
        metadata: {
          tripId: GOOD_UUID_1,
          userId: GOOD_UUID_2,
          tier: "standard",
          launchPricing: "true",
          cities: "Tokyo, Kyoto",
          tripLengthDays: "7",
        },
        ...overrides,
      },
    },
  };
}

describe("stripe-webhook", () => {
  let supabaseMock: {
    from: Mock;
    update: Mock;
    eq: Mock;
    rpc: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Chainable thenable so .update().eq().eq() awaits cleanly.
    const chainable: Record<string, unknown> = {
      eq: (..._args: unknown[]) => chainable,
      then: (resolve: (v: { data: null; error: null }) => void) =>
        resolve({ data: null, error: null }),
    };

    supabaseMock = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(chainable),
      }),
      update: vi.fn().mockReturnValue(chainable),
      eq: chainable.eq as Mock,
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    (getServiceRoleClient as unknown as Mock).mockReturnValue(supabaseMock);
  });

  describe("metadata validation", () => {
    it("skips DB write when tripId is not a UUID", async () => {
      (constructWebhookEvent as unknown as Mock).mockResolvedValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_1",
            metadata: { tripId: "not-a-uuid", userId: GOOD_UUID_1, tier: "standard" },
          },
        },
      });
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it("skips DB write when userId is an injection payload", async () => {
      (constructWebhookEvent as unknown as Mock).mockResolvedValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_2",
            metadata: { tripId: GOOD_UUID_1, userId: "'; drop table--", tier: "standard" },
          },
        },
      });
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).not.toHaveBeenCalled();
    });

    it("proceeds to RPC when both IDs are valid UUIDs", async () => {
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(makeCheckoutEvent());
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).toHaveBeenCalledWith("process_webhook_event", {
        p_event_id: "evt_test_123",
        p_event_type: "checkout.session.completed",
        p_trip_id: GOOD_UUID_1,
        p_user_id: GOOD_UUID_2,
        p_tier: "standard",
        p_stripe_session_id: "cs_test_session",
        p_amount_cents: 1900,
        p_customer_id: "cus_test_123",
        p_launch_pricing: true,
      });
    });
  });

  describe("RPC parameters", () => {
    it("passes null customer_id when session.customer is null", async () => {
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(
        makeCheckoutEvent({ customer: null }),
      );
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        "process_webhook_event",
        expect.objectContaining({ p_customer_id: null }),
      );
    });

    it("passes false for launch_pricing when metadata flag absent", async () => {
      const evt = makeCheckoutEvent();
      delete (evt.data.object.metadata as Record<string, unknown>).launchPricing;
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(evt);
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        "process_webhook_event",
        expect.objectContaining({ p_launch_pricing: false }),
      );
    });

    it("defaults amount_cents to 0 when amount_total is null", async () => {
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(
        makeCheckoutEvent({ amount_total: null }),
      );
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(supabaseMock.rpc).toHaveBeenCalledWith(
        "process_webhook_event",
        expect.objectContaining({ p_amount_cents: 0 }),
      );
    });
  });

  describe("idempotency (duplicate events)", () => {
    it("skips email when RPC returns false (duplicate)", async () => {
      supabaseMock.rpc.mockResolvedValue({ data: false, error: null });
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(makeCheckoutEvent());
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(sendUnlockConfirmationEmail).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "Webhook event already processed, skipping",
        expect.objectContaining({ eventId: "evt_test_123" }),
      );
    });

    it("sends email when RPC returns true (first processing)", async () => {
      supabaseMock.rpc.mockResolvedValue({ data: true, error: null });
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(makeCheckoutEvent());
      (sendUnlockConfirmationEmail as unknown as Mock).mockResolvedValue(undefined);
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(sendUnlockConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          tier: "standard",
        }),
      );
    });
  });

  describe("RPC error handling", () => {
    it("returns 500 when RPC fails", async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: null,
        error: { message: "connection refused", code: "PGRST301" },
      });
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(makeCheckoutEvent());
      const res = await POST(makeRequest());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Internal error");
      expect(logger.error).toHaveBeenCalledWith(
        "process_webhook_event RPC failed",
        expect.any(Error),
        expect.objectContaining({ eventId: "evt_test_123", tripId: GOOD_UUID_1 }),
      );
    });
  });

  describe("email side effects", () => {
    it("skips email when no customer_details email", async () => {
      supabaseMock.rpc.mockResolvedValue({ data: true, error: null });
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(
        makeCheckoutEvent({ customer_details: null }),
      );
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(sendUnlockConfirmationEmail).not.toHaveBeenCalled();
    });

    it("records email error on trips table when sending fails", async () => {
      supabaseMock.rpc.mockResolvedValue({ data: true, error: null });
      (constructWebhookEvent as unknown as Mock).mockResolvedValue(makeCheckoutEvent());
      (sendUnlockConfirmationEmail as unknown as Mock).mockRejectedValue(
        new Error("Resend API down"),
      );

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            Promise.resolve({ data: null, error: null }),
          ),
        }),
      });
      supabaseMock.from.mockReturnValue({ update: updateMock });

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          unlock_email_sent_at: null,
          unlock_email_error: "Resend API down",
        }),
      );
    });
  });
});
