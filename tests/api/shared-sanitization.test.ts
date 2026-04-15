import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

// Mock Supabase service role client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/serviceRole", () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "trip_shares") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockMaybeSingle.mockResolvedValue({
                  data: {
                    id: "share-1",
                    trip_id: "trip-1",
                    view_count: 5,
                    created_at: "2026-04-01T00:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "trips") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: mockSelect.mockResolvedValue({
                  data: {
                    name: "Test Trip",
                    itinerary: { days: [{ activities: [] }] },
                    builder_data: {
                      dates: {
                        start: "2026-05-01",
                        end: "2026-05-07",
                      },
                      cities: ["tokyo", "kyoto"],
                      vibes: ["culture"],
                      dietary: ["vegetarian", "halal"],
                      dietaryOther: "No shellfish due to allergy",
                      accessibility: {
                        mobility: true,
                        visual: false,
                        notes: "Wheelchair user, needs ramp access",
                      },
                    },
                    created_at: "2026-04-01T00:00:00Z",
                    updated_at: "2026-04-10T00:00:00Z",
                    unlocked_at: "2026-04-05T00:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    }),
  })),
}));

// Mock rate limit
vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/middleware", () => ({
  createRequestContext: vi.fn().mockReturnValue({
    requestId: "test-request-id",
    startTime: Date.now(),
  }),
  addRequestContextHeaders: vi.fn((response: NextResponse) => response),
  getOptionalAuth: vi.fn().mockResolvedValue({
    user: null,
    context: { requestId: "test-request-id" },
  }),
  requireJsonContentType: vi.fn().mockReturnValue(null),
}));

import { GET } from "@/app/api/shared/[token]/route";
import { NextRequest } from "next/server";

describe("GET /api/shared/[token] PII sanitization", () => {
  it("strips dietary and accessibility fields entirely from builder_data", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/shared/test-share-token-abc",
    );

    const response = await GET(request, {
      params: Promise.resolve({ token: "test-share-token-abc" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    const builderData = data.trip.builderData;

    // These fields should be completely stripped
    expect(builderData.dietary).toBeUndefined();
    expect(builderData.dietaryOther).toBeUndefined();
    expect(builderData.accessibility).toBeUndefined();

    // Non-sensitive fields should still be present
    expect(builderData.dates).toBeDefined();
    expect(builderData.cities).toEqual(["tokyo", "kyoto"]);
    expect(builderData.vibes).toEqual(["culture"]);
  });

  it("returns null builderData when trip has no builder_data", async () => {
    // Override mock for this test
    mockSelect.mockResolvedValueOnce({
      data: {
        name: "Empty Trip",
        itinerary: { days: [] },
        builder_data: null,
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
        unlocked_at: null,
      },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/shared/test-share-token-xyz",
    );

    const response = await GET(request, {
      params: Promise.resolve({ token: "test-share-token-xyz" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.trip.builderData).toBeNull();
  });
});
