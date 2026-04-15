import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockTrip = {
  itinerary: { days: [] },
  builder_data: {},
  unlocked_at: new Date().toISOString(),
  user_id: "22222222-2222-2222-2222-222222222222",
};

const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: mockTrip }) }),
      }),
    }),
    update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
  }),
};

vi.mock("@/lib/supabase/serviceRole", () => ({
  getServiceRoleClient: () => mockSupabase,
}));
vi.mock("@/lib/server/intentExtractor", () => ({
  extractTripIntent: vi.fn(() => Promise.resolve({})),
}));

const mockProse = vi.fn();
const mockBriefings = vi.fn();

vi.mock("@/lib/server/guideProseGenerator", () => ({
  generateGuideProse: (...args: unknown[]) => mockProse(...args),
}));
vi.mock("@/lib/server/dailyBriefingGenerator", () => ({
  generateDailyBriefings: (...args: unknown[]) => mockBriefings(...args),
}));
vi.mock("@/lib/api/withApiHandler", () => ({
  withApiHandler: (handler: (req: NextRequest, ctx: { context: { requestId: string }; user: { id: string } }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler(req, {
        context: { requestId: "test" },
        user: { id: "22222222-2222-2222-2222-222222222222" },
      }),
}));

function buildRequest() {
  return new NextRequest("https://example.com/api/billing/complete-generation", {
    method: "POST",
    body: JSON.stringify({ tripId: "11111111-1111-1111-1111-111111111111" }),
    headers: { "Content-Type": "application/json" },
  });
}

describe("complete-generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 502 retryable when guide prose fails", async () => {
    mockProse.mockRejectedValue(new Error("Vertex quota"));
    mockBriefings.mockResolvedValue({ days: [] });
    const { POST } = await import("@/app/api/billing/complete-generation/route");
    const res = await POST(buildRequest());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "Generation failed", retryable: true });
  });

  it("returns 502 retryable when briefings fail", async () => {
    mockProse.mockResolvedValue({ days: [] });
    mockBriefings.mockRejectedValue(new Error("Vertex 500"));
    const { POST } = await import("@/app/api/billing/complete-generation/route");
    const res = await POST(buildRequest());
    expect(res.status).toBe(502);
  });

  it("returns 200 when both succeed", async () => {
    mockProse.mockResolvedValue({ days: [{ dayId: "d1", intro: "Hello" }] });
    mockBriefings.mockResolvedValue({ days: [] });
    const { POST } = await import("@/app/api/billing/complete-generation/route");
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
  });
});
