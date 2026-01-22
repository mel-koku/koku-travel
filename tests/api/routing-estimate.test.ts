import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/routing/estimate/route";
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
}));

vi.mock("@/lib/api/bodySizeLimit", () => ({
  readBodyWithSizeLimit: vi.fn().mockImplementation(async (request) => {
    const body = await request.text();
    return { body, response: null };
  }),
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

describe("POST /api/routing/estimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockRequestRoute.mockResolvedValue({
      mode: "transit",
      durationSeconds: 1800, // 30 minutes
      distanceMeters: 8000, // 8km
      legs: [],
      geometry: null,
    });
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify({
          destination: { lat: 35.0394, lng: 135.7292 },
          mode: "transit",
        }),
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify({
          origin: { lat: 35.0116, lng: 135.7681 },
          mode: "transit",
        }),
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify({
          origin: { lat: 35.0116, lng: 135.7681 },
          destination: { lat: 35.0394, lng: 135.7292 },
        }),
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify({
          ...createValidRoutingRequest(),
          mode: "teleport",
        }),
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createValidRoutingRequest(),
          mode: "teleport",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Invalid mode");
    });

    it("should return 400 for body exceeding 64KB limit", async () => {
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: null,
        response: NextResponse.json(
          { error: "Request body too large", code: "BAD_REQUEST" },
          { status: 400 },
        ),
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(100000),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: null,
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid JSON", async () => {
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: "{invalid json",
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify({ ...createValidRoutingRequest(), mode }),
        response: null,
      });

      mockRequestRoute.mockResolvedValue({
        mode,
        durationSeconds: 1800,
        distanceMeters: 8000,
        legs: [],
        geometry: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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

  describe("Successful estimation", () => {
    it("should return duration in minutes and distance in meters", async () => {
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify(createValidRoutingRequest()),
        response: null,
      });

      mockRequestRoute.mockResolvedValue({
        mode: "transit",
        durationSeconds: 1800, // 30 minutes
        distanceMeters: 8500,
        legs: [],
        geometry: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.mode).toBe("transit");
      expect(data.durationMinutes).toBe(30);
      expect(data.distanceMeters).toBe(8500);
    });

    it("should set cache headers on successful response", async () => {
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify(createValidRoutingRequest()),
        response: null,
      });

      const request = createMockRequest("https://example.com/api/routing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("private");
      expect(response.headers.get("Cache-Control")).toContain("max-age=30");
    });
  });

  describe("Error handling", () => {
    it("should return 500 when routing service throws an error", async () => {
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify(createValidRoutingRequest()),
        response: null,
      });

      mockRequestRoute.mockRejectedValue(new Error("Routing service unavailable"));

      const request = createMockRequest("https://example.com/api/routing/estimate", {
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
      const { readBodyWithSizeLimit } = await import("@/lib/api/bodySizeLimit");
      vi.mocked(readBodyWithSizeLimit).mockResolvedValueOnce({
        body: JSON.stringify(createValidRoutingRequest()),
        response: null,
      });

      mockRequestRoute.mockRejectedValue(new Error("API quota exceeded"));

      const request = createMockRequest("https://example.com/api/routing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValidRoutingRequest()),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("API quota exceeded");
    });
  });
});
