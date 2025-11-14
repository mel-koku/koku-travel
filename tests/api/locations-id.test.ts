import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/locations/[id]/route";
import { fetchLocationDetails } from "@/lib/googlePlaces";
import { createMockRequest, createMockLocationDetails } from "../utils/mocks";
import { MOCK_LOCATIONS } from "@/data/mockLocations";

// Mock dependencies
vi.mock("@/lib/googlePlaces", () => ({
  fetchLocationDetails: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("GET /api/locations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/locations/test-id");
      const context = {
        params: Promise.resolve({ id: "kyoto-kiyomizu-dera" }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Location ID validation", () => {
    it("should return 400 for invalid location ID (path traversal)", async () => {
      const request = createMockRequest("https://example.com/api/locations/../../../etc/passwd");
      const context = {
        params: Promise.resolve({ id: "../../../etc/passwd" }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Invalid location ID format");
    });

    it("should return 400 for invalid location ID (special characters)", async () => {
      const request = createMockRequest("https://example.com/api/locations/test<script>alert(1)</script>");
      const context = {
        params: Promise.resolve({ id: "test<script>alert(1)</script>" }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for empty location ID", async () => {
      const request = createMockRequest("https://example.com/api/locations/");
      const context = {
        params: Promise.resolve({ id: "" }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should accept valid location ID", async () => {
      const mockDetails = createMockLocationDetails();
      vi.mocked(fetchLocationDetails).mockResolvedValueOnce(mockDetails);

      const validLocation = MOCK_LOCATIONS[0];
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.location).toBeDefined();
      expect(data.location.id).toBe(validLocation.id);
    });
  });

  describe("Location not found", () => {
    it("should return 404 for non-existent location", async () => {
      const request = createMockRequest("https://example.com/api/locations/non-existent-id");
      const context = {
        params: Promise.resolve({ id: "non-existent-id" }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe("NOT_FOUND");
      expect(data.error).toContain("Location not found");
    });
  });

  describe("Google Places API integration", () => {
    it("should return location with details when found", async () => {
      const mockDetails = createMockLocationDetails();
      vi.mocked(fetchLocationDetails).mockResolvedValueOnce(mockDetails);

      const validLocation = MOCK_LOCATIONS[0];
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.location).toBeDefined();
      expect(data.details).toBeDefined();
      expect(data.details.placeId).toBe(mockDetails.placeId);
      expect(fetchLocationDetails).toHaveBeenCalledWith(validLocation);
    });

    it("should return 503 if Google Places API is not configured", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

      vi.mocked(fetchLocationDetails).mockRejectedValueOnce(
        new Error("Missing Google Places API key"),
      );

      const validLocation = MOCK_LOCATIONS[0];
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.code).toBe("SERVICE_UNAVAILABLE");
      expect(data.error).toContain("Google Places API is not configured");
    });

    it("should return 500 for other Google Places API errors", async () => {
      vi.mocked(fetchLocationDetails).mockRejectedValueOnce(new Error("Network error"));

      const validLocation = MOCK_LOCATIONS[0];
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Response caching", () => {
    it("should set appropriate cache headers", async () => {
      const mockDetails = createMockLocationDetails();
      vi.mocked(fetchLocationDetails).mockResolvedValueOnce(mockDetails);

      const validLocation = MOCK_LOCATIONS[0];
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
      );
    });
  });
});

