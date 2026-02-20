import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/routing/route/route";
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

// Mock routing module
const mockRequestRoute = vi.fn();

vi.mock("@/lib/routing", () => ({
  requestRoute: (...args: unknown[]) => mockRequestRoute(...args),
}));

// Helper to create valid routing request
function createValidRoutingRequest() {
  return {
    origin: { lat: 35.0116, lng: 135.7681 }, // Kyoto Station
    destination: { lat: 35.0394, lng: 135.7292 }, // Kinkaku-ji
    mode: "transit",
  };
}

// Helper to create mock route response with instructions
function createMockRouteResponse() {
  return {
    mode: "transit",
    durationSeconds: 1800, // 30 minutes
    distanceMeters: 8000,
    geometry: "encodedPolylineString",
    legs: [
      {
        steps: [
          { instruction: "Head north on Karasuma-dori" },
          { instruction: "Take the Karasuma subway line" },
          { instruction: "Exit at Kitaoji Station" },
          { instruction: "Walk to Kinkaku-ji" },
        ],
      },
    ],
  };
}

describe("POST /api/routing/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockRequestRoute.mockResolvedValue(createMockRouteResponse());
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Request body validation", () => {
    it("should return 400 for missing origin", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: { lat: 35.0394, lng: 135.7292 },
          mode: "transit",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("origin");
    });

    it("should return 400 for missing destination", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: 35.0116, lng: 135.7681 },
          mode: "transit",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("destination");
    });

    it("should return 400 for missing mode", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: 35.0116, lng: 135.7681 },
          destination: { lat: 35.0394, lng: 135.7292 },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("mode");
    });

    it("should return 400 for invalid transport mode", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createValidRoutingRequest(),
          mode: "flying",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Invalid mode");
    });

    it("should return 400 for invalid JSON", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid json",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });
  });

  describe("Valid transport modes", () => {
    const validModes = ["driving", "walking", "transit", "cycling"];

    it.each(validModes)("should accept valid transport mode: %s", async (mode) => {
      mockRequestRoute.mockResolvedValue({
        ...createMockRouteResponse(),
        mode,
      });

      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createValidRoutingRequest(), mode }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.mode).toBe(mode);
    });
  });

  describe("Successful route response", () => {
    it("should return route with duration, distance, and path", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.mode).toBe("transit");
      expect(data.durationMinutes).toBe(30);
      expect(data.distanceMeters).toBe(8000);
      expect(data.path).toBe("encodedPolylineString");
    });

    it("should include turn-by-turn instructions", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instructions).toBeDefined();
      expect(Array.isArray(data.instructions)).toBe(true);
      expect(data.instructions).toContain("Head north on Karasuma-dori");
      expect(data.instructions).toContain("Take the Karasuma subway line");
    });

    it("should omit instructions when none available", async () => {
      mockRequestRoute.mockResolvedValue({
        ...createMockRouteResponse(),
        legs: [{ steps: [] }],
      });

      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instructions).toBeUndefined();
    });
  });

  describe("Departure time handling", () => {
    it("should calculate arrival time from ISO departure time", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createValidRoutingRequest(),
          departureTime: "2026-03-01T09:00:00Z",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.departureTime).toBe("2026-03-01T09:00:00Z");
      expect(data.arrivalTime).toBeDefined();
    });

    it("should calculate arrival time from HH:MM departure time", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createValidRoutingRequest(),
          departureTime: "09:00",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.departureTime).toBe("09:00");
      expect(data.arrivalTime).toBeDefined();
      // With 30 min duration, arrival should be at 09:30
      expect(data.arrivalTime).toBe("09:30");
    });

    it("should handle timezone in arrival time calculation", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createValidRoutingRequest(),
          departureTime: "09:00",
          timezone: "Asia/Tokyo",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.arrivalTime).toBeDefined();
    });

    it("should not include arrival time when no departure time provided", async () => {
      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.arrivalTime).toBeUndefined();
      expect(data.departureTime).toBeUndefined();
    });
  });

  describe("Error handling", () => {
    it("should return 500 when routing service throws an error", async () => {
      mockRequestRoute.mockRejectedValue(new Error("Routing service unavailable"));

      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should include error message in 500 response", async () => {
      mockRequestRoute.mockRejectedValue(new Error("No route found between locations"));

      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("No route found");
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockRequestRoute.mockRejectedValue("Unknown routing error");

      const request = createMockRequest("https://example.com/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
});
