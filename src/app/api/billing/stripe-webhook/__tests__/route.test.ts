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

describe("stripe-webhook metadata validation", () => {
  let supabaseMock: {
    from: Mock;
    update: Mock;
    eq: Mock;
    upsert: Mock;
    rpc: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock = {
      from: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      upsert: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    // Chainable thenable so .update().eq().eq() awaits cleanly.
    const chainable: Record<string, unknown> = {
      eq: (..._args: unknown[]) => chainable,
      then: (resolve: (v: { data: null; error: null }) => void) =>
        resolve({ data: null, error: null }),
    };
    supabaseMock.from.mockReturnValue(supabaseMock);
    supabaseMock.update.mockReturnValue(chainable);
    supabaseMock.eq = chainable.eq as Mock;
    supabaseMock.upsert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    (getServiceRoleClient as unknown as Mock).mockReturnValue(supabaseMock);
  });

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
    expect(supabaseMock.from).not.toHaveBeenCalled();
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
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("proceeds to DB write when both IDs are valid UUIDs", async () => {
    (constructWebhookEvent as unknown as Mock).mockResolvedValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_3",
          amount_total: 1900,
          customer: null,
          customer_details: null,
          metadata: {
            tripId: GOOD_UUID_1,
            userId: GOOD_UUID_2,
            tier: "standard",
          },
        },
      },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(supabaseMock.from).toHaveBeenCalledWith("trips");
  });
});
