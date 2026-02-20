import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/itinerary/plan/route";
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

vi.mock("@/lib/cache/itineraryCache", () => ({
  getCachedItinerary: vi.fn().mockResolvedValue(null),
  cacheItinerary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/validation/itineraryValidator", () => ({
  validateItinerary: vi.fn().mockReturnValue({
    valid: true,
    issues: [],
    summary: { errorCount: 0, warningCount: 0, duplicateLocations: 0 },
  }),
}));

// Mock the itinerary engine
const mockGenerateTripFromBuilderData = vi.fn();
const mockValidateTripConstraints = vi.fn();

vi.mock("@/lib/server/itineraryEngine", () => ({
  generateTripFromBuilderData: (...args: unknown[]) => mockGenerateTripFromBuilderData(...args),
  validateTripConstraints: (...args: unknown[]) => mockValidateTripConstraints(...args),
}));

// Mock traveler profile builder
vi.mock("@/lib/domain/travelerProfile", () => ({
  buildTravelerProfile: vi.fn().mockReturnValue({
    interests: ["culture"],
    budget: "moderate",
    mobility: "full",
  }),
}));

// Helper to create valid builder data
function createValidBuilderData() {
  return {
    duration: 3,
    dates: {
      start: "2026-03-01",
      end: "2026-03-03",
    },
    regions: ["Kansai"],
    cities: ["Kyoto"],
    interests: ["culture"],
    style: "balanced",
  };
}

// Helper to create mock trip response
function createMockTrip(tripId: string) {
  return {
    id: tripId,
    name: "Test Trip",
    days: [
      {
        id: "day-1",
        date: "2026-03-01",
        cityId: "kyoto",
        activities: [],
      },
    ],
    metadata: {
      startDate: "2026-03-01",
      endDate: "2026-03-03",
      totalDays: 3,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("POST /api/itinerary/plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    // API expects { trip, itinerary } structure
    mockGenerateTripFromBuilderData.mockResolvedValue({
      trip: createMockTrip("trip-123"),
      itinerary: { days: [] },
    });
    mockValidateTripConstraints.mockReturnValue({ valid: true, issues: [] });
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 20 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData: createValidBuilderData() }),
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Request body validation", () => {
    it("should return 400 for non-JSON content type", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "not json",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for missing builderData", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid builderData (missing dates)", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData: {
            duration: 3,
            // missing dates
          },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid date format in builderData", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData: {
            ...createValidBuilderData(),
            dates: {
              start: "invalid-date",
              end: "2026-03-03",
            },
          },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid JSON", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid json",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for request body exceeding 1MB", async () => {
      // Create a large payload (~1.5MB)
      const largeData = {
        builderData: {
          ...createValidBuilderData(),
          // Add large array to exceed 1MB
          extraData: Array(100000).fill("x".repeat(20)),
        },
      };
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "1500000",
        },
        body: JSON.stringify(largeData),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });
  });

  describe("Successful trip generation", () => {
    it("should generate a trip from valid builderData", async () => {
      const builderData = createValidBuilderData();
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.trip).toBeDefined();
      expect(data.trip.id).toBe("trip-123");
      expect(data.validation).toBeDefined();
      expect(data.validation.valid).toBe(true);
    });

    it("should use provided tripId when specified", async () => {
      const customTripId = "custom-trip-id";
      mockGenerateTripFromBuilderData.mockResolvedValue({
        trip: createMockTrip(customTripId),
        itinerary: { days: [] },
      });

      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData: createValidBuilderData(),
          tripId: customTripId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.trip.id).toBe(customTripId);
      expect(mockGenerateTripFromBuilderData).toHaveBeenCalledWith(
        expect.anything(),
        customTripId,
        undefined,
      );
    });

    it("should generate tripId when not provided", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData: createValidBuilderData() }),
      });

      await POST(request);

      expect(mockGenerateTripFromBuilderData).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^trip-\d+-[a-z0-9]+$/),
        undefined,
      );
    });

    it("should return validation issues when present", async () => {
      mockValidateTripConstraints.mockReturnValue({
        valid: false,
        issues: ["Schedule too packed", "Missing lunch break"],
      });

      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData: createValidBuilderData() }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.validation.valid).toBe(false);
      expect(data.validation.issues).toContain("Schedule too packed");
    });
  });

  describe("Error handling", () => {
    it("should return 500 when itinerary engine throws an error", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue(
        new Error("Database unavailable"),
      );

      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData: createValidBuilderData() }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
      expect(data.error).toBe("Failed to generate itinerary");
      // In non-production mode, details are included
      if (data.details) {
        expect(data.details.message).toBe("Database unavailable");
      }
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue("Unknown error");

      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData: createValidBuilderData() }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Cache headers", () => {
    it("should set no-cache headers on response", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderData: createValidBuilderData() }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });
  });
});
