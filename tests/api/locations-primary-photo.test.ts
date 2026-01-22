import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/locations/[id]/primary-photo/route";
import { fetchLocationDetails } from "@/lib/googlePlaces";
import { createMockRequest, createMockLocationDetails } from "../utils/mocks";
import { TEST_LOCATIONS, locationToDbRow } from "../fixtures/locations";

// Mock dependencies
vi.mock("@/lib/googlePlaces", () => ({
  fetchLocationDetails: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock Supabase client - use hoisted variable pattern
let mockSupabaseResponse: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(mockSupabaseResponse),
        }),
      }),
    }),
  })),
}));

// Helper to set up Supabase mock for a location
const mockSupabaseLocation = (location: typeof TEST_LOCATIONS.kyotoTemple | null) => {
  if (location) {
    mockSupabaseResponse = {
      data: locationToDbRow(location),
      error: null,
    };
  } else {
    mockSupabaseResponse = { data: null, error: { message: "Not found" } };
  }
};

describe("GET /api/locations/[id]/primary-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
    // Default: return first mock location
    mockSupabaseLocation(TEST_LOCATIONS.kyotoTemple);
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/locations/test-id/primary-photo");
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
      const request = createMockRequest("https://example.com/api/locations/../../../etc/passwd/primary-photo");
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
      const request = createMockRequest("https://example.com/api/locations/test<script>/primary-photo");
      const context = {
        params: Promise.resolve({ id: "test<script>alert(1)</script>" }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should accept valid location ID", async () => {
      const mockDetails = createMockLocationDetails();
      vi.mocked(fetchLocationDetails).mockResolvedValueOnce(mockDetails);

      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.placeId).toBeDefined();
    });
  });

  describe("Location not found", () => {
    it("should return 404 for non-existent location", async () => {
      // Mock Supabase returning no location
      mockSupabaseLocation(null);

      const request = createMockRequest("https://example.com/api/locations/non-existent-id/primary-photo");
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

  describe("Primary photo handling", () => {
    it("should return primary photo when available", async () => {
      const mockDetails = createMockLocationDetails();
      mockDetails.photos = [
        {
          name: "places/test-place/photos/primary-photo",
          widthPx: 1600,
          heightPx: 1200,
          proxyUrl: "/api/places/photo?photoName=places/test-place/photos/primary-photo",
          attributions: [],
        },
      ];
      vi.mocked(fetchLocationDetails).mockResolvedValueOnce(mockDetails);

      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.photo).toBeDefined();
      expect(data.photo.name).toBe("places/test-place/photos/primary-photo");
    });

    it("should return null photo when no photos available", async () => {
      const mockDetails = createMockLocationDetails();
      mockDetails.photos = [];
      vi.mocked(fetchLocationDetails).mockResolvedValueOnce(mockDetails);

      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.photo).toBeNull();
    });
  });

  describe("Google Places API error handling", () => {
    it("should return 503 if Google Places API is not configured", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

      vi.mocked(fetchLocationDetails).mockRejectedValueOnce(
        new Error("Missing Google Places API key"),
      );

      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
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

      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
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

      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
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

