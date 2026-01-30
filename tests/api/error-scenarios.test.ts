import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/itinerary/plan/route";
import { createMockRequest } from "../utils/mocks";

// Mock dependencies at module level
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
}));

vi.mock("@/lib/cache/itineraryCache", () => ({
  getCachedItinerary: vi.fn().mockResolvedValue(null),
  cacheItinerary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/domain/travelerProfile", () => ({
  buildTravelerProfile: vi.fn().mockReturnValue({
    interests: ["culture"],
    budget: "moderate",
    mobility: "full",
  }),
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

function createMockTrip() {
  return {
    id: "trip-123",
    name: "Test Trip",
    days: [],
    metadata: {
      startDate: "2026-03-01",
      endDate: "2026-03-03",
      totalDays: 3,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createValidBuilderData() {
  return {
    duration: 3,
    dates: { start: "2026-03-01", end: "2026-03-03" },
    regions: ["Kansai"],
    cities: ["Kyoto"],
    interests: ["culture"],
    style: "balanced",
  };
}

describe("API Error Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateTripFromBuilderData.mockResolvedValue({
      trip: createMockTrip(),
      itinerary: { days: [] },
    });
    mockValidateTripConstraints.mockReturnValue({ valid: true, issues: [] });
  });

  describe("Database timeouts", () => {
    it("should handle database timeout gracefully", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue(
        new Error("Database operation timed out after 10000ms"),
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
    });

    it("should handle connection pool exhaustion", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue(
        new Error("Connection pool exhausted. No available connections."),
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
    });
  });

  describe("Concurrent request handling", () => {
    it("should handle multiple concurrent requests", async () => {
      let callCount = 0;
      mockGenerateTripFromBuilderData.mockImplementation(
        () => new Promise((resolve) => {
          callCount++;
          // Simulate some processing time
          setTimeout(() => {
            resolve({
              trip: { ...createMockTrip(), id: `trip-${callCount}` },
              itinerary: { days: [] },
            });
          }, 10);
        }),
      );

      const builderData = createValidBuilderData();

      // Make 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        createMockRequest("https://example.com/api/itinerary/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ builderData }),
        }),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      // All requests should complete successfully
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // All 5 requests should have been processed
      expect(callCount).toBe(5);
    });
  });

  describe("Malformed request handling", () => {
    it("should handle null values in request body", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData: {
            duration: null,
            dates: null,
            regions: null,
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should handle deeply nested invalid data", async () => {
      const request = createMockRequest("https://example.com/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData: {
            duration: 3,
            dates: { start: "2026-03-01", end: "2026-03-03" },
            regions: ["Kansai"],
            cities: ["Kyoto"],
            interests: ["culture"],
            style: "balanced",
            // Nested extra data should be ignored
            extraNested: {
              level1: {
                level2: {
                  level3: "this should be ignored but not cause errors",
                },
              },
            },
          },
        }),
      });

      const response = await POST(request);
      // Should succeed (extra fields are typically ignored by Zod)
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("Network error simulation", () => {
    it("should handle external API failures", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue(
        new Error("ECONNREFUSED: Connection refused to external service"),
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
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue("Unknown string error");

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

  describe("Error message content", () => {
    it("should not leak internal error details in production mode", async () => {
      mockGenerateTripFromBuilderData.mockRejectedValue(
        new Error("Internal database error with sensitive info: password=secret123"),
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
    });
  });
});
