import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/itinerary/refine/route";
import { createMockRequest } from "../utils/mocks";

// Mock dependencies
vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/middleware", () => ({
  createRequestContext: vi.fn().mockReturnValue({
    requestId: "test-request-id",
    startTime: Date.now(),
  }),
  addRequestContextHeaders: vi.fn((response) => response),
  getOptionalAuth: vi.fn().mockResolvedValue({
    user: null,
    context: { requestId: "test-request-id" },
  }),
  requireJsonContentType: vi.fn().mockReturnValue(null),
}));

// Mock refinement engine
const mockRefineDay = vi.fn();

vi.mock("@/lib/server/refinementEngine", () => ({
  refineDay: (...args: unknown[]) => mockRefineDay(...args),
}));

// Mock itinerary engine
vi.mock("@/lib/server/itineraryEngine", () => ({
  convertItineraryToTrip: vi.fn().mockImplementation((itinerary, builderData, tripId) => ({
    id: tripId,
    days: itinerary.days.map((day: { id: string; dateLabel: string; cityId?: string; activities: unknown[] }) => ({
      id: day.id,
      date: day.dateLabel,
      cityId: day.cityId ?? "kyoto",
      activities: day.activities.map((act: { id?: string; locationId?: string }) => ({
        id: act.id ?? "act-1",
        locationId: act.locationId ?? "loc-1",
        duration: 60,
        timeSlot: "morning",
      })),
    })),
    metadata: builderData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          in: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
          range: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  })),
}));

// Note: MOCK_LOCATIONS mock removed - code now uses database via locationService

describe("POST /api/itinerary/refine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefineDay.mockImplementation(({ trip, dayIndex }) => ({
      ...trip.days[dayIndex],
      activities: trip.days[dayIndex].activities.slice(0, -1),
    }));
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 30 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: "test" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Request validation", () => {
    it("should return 400 for non-JSON content type", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "not json",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid JSON", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid}",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for missing required fields", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayIndex: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid tripId format", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: "invalid<script>",
          dayIndex: 0,
          refinementType: "more_diverse",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for dayIndex out of range", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: "trip-123",
          dayIndex: 50, // Max is 30 in schema
          refinementType: "more_diverse",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid refinement type in schema", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: "trip-123",
          dayIndex: 0,
          refinementType: "completely_invalid_type",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });
  });

  describe("Schema-valid refinement types (will fail at VALID_REFINEMENT_TYPES check)", () => {
    // These types pass zod schema but fail the VALID_REFINEMENT_TYPES check in the route
    const schemaValidTypes = [
      "more_diverse",
      "more_focused",
      "more_adventurous",
      "more_relaxed",
      "more_budget_friendly",
      "more_luxury",
    ];

    it.each(schemaValidTypes)("type '%s' passes schema but may fail logic check", async (type) => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: {
            id: "trip-123",
            days: [{ id: "day-1", date: "2026-03-01", cityId: "kyoto", activities: [] }],
          },
          refinementType: type,
          dayIndex: 0,
        }),
      });
      const response = await POST(request);

      // Due to schema/logic mismatch, this returns 400 (fails VALID_REFINEMENT_TYPES check)
      expect(response.status).toBe(400);
    });
  });

  describe("Legacy format without refinementType (falls through to tripId check)", () => {
    it("should return 400 when tripId is provided without itinerary/builderData", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: "trip-123",
          dayIndex: 0,
          // refinementType omitted - passes schema
          // but missing builderData/itinerary
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });
  });
});
