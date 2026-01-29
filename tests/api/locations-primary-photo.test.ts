import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/locations/[id]/primary-photo/route";
import { createMockRequest } from "../utils/mocks";
import { TEST_LOCATIONS, locationToDbRow } from "../fixtures/locations";

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
const mockSupabaseLocation = (location: typeof TEST_LOCATIONS.kyotoTemple | null, overrides?: Record<string, unknown>) => {
  if (location) {
    mockSupabaseResponse = {
      data: { ...locationToDbRow(location), ...overrides },
      error: null,
    };
  } else {
    mockSupabaseResponse = { data: null, error: { message: "Not found" } };
  }
};

describe("GET /api/locations/[id]/primary-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("Primary photo from database", () => {
    it("should return primary_photo_url from database when available", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      mockSupabaseLocation(validLocation, {
        primary_photo_url: "https://example.com/photos/kiyomizu-dera.jpg",
      });

      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.photo).toBeDefined();
      expect(data.photo.proxyUrl).toBe("https://example.com/photos/kiyomizu-dera.jpg");
    });

    it("should fall back to location image when no primary_photo_url", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      mockSupabaseLocation(validLocation, {
        primary_photo_url: null,
        image: "https://example.com/fallback.jpg",
      });

      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.photo).toBeDefined();
      expect(data.photo.proxyUrl).toBe("https://example.com/fallback.jpg");
    });

    it("should return null photo when neither primary_photo_url nor image available", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      mockSupabaseLocation(validLocation, {
        primary_photo_url: null,
        image: null,
      });

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

  describe("Response caching", () => {
    it("should set appropriate cache headers for DB-backed responses", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}/primary-photo`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      // Cache headers increased since data is from DB, not real-time API
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      );
    });
  });
});
