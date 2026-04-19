import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/withApiHandler", () => ({
  withApiHandler: (handler: Parameters<typeof import("@/lib/api/withApiHandler").withApiHandler>[0]) =>
    async (request: NextRequest) =>
      handler(request, {
        context: { requestId: "test-req", route: "/api/billing/checkout", ip: "127.0.0.1" },
        user: { id: "test-user-id" } as import("@supabase/supabase-js").User,
      }),
}));

vi.mock("@/lib/billing/accessServer", () => ({
  isFullAccessEnabled: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/billing/stripe", () => ({
  createCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/billing/access", () => ({
  getTripTier: vi.fn().mockReturnValue("standard"),
}));

vi.mock("@/lib/api/rateLimits", () => ({
  RATE_LIMITS: {
    BILLING_CHECKOUT: { maxRequests: 5, windowMs: 60_000 },
  },
}));

import { POST } from "../route";
import { isFullAccessEnabled } from "@/lib/billing/accessServer";

function makeRequest(body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify(
      body ?? {
        tripId: "00000000-0000-0000-0000-000000000001",
        tripLengthDays: 7,
        cities: ["Tokyo"],
        tripDates: "2026-05-01 to 2026-05-07",
      },
    ),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/billing/checkout — free access conflict", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 409 with code free_access_enabled when full access is on", async () => {
    vi.mocked(isFullAccessEnabled).mockResolvedValue(true);

    const res = await POST(makeRequest());

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("free_access_enabled");
    expect(body.error).toMatch(/free right now/i);
  });

  it("response body includes a user-friendly message when full access is on", async () => {
    vi.mocked(isFullAccessEnabled).mockResolvedValue(true);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});
