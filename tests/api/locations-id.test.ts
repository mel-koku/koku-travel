import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/locations/[id]/route";
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

describe("GET /api/locations/[id]", () => {
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
      const validLocation = TEST_LOCATIONS.kyotoTemple;
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
      // Mock Supabase returning no location
      mockSupabaseLocation(null);

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

  describe("Database-backed response", () => {
    it("should return location with details from database", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.location).toBeDefined();
      expect(data.details).toBeDefined();
      expect(data.location.id).toBe(validLocation.id);
      expect(data.location.name).toBe(validLocation.name);
      // Details are now built from DB data
      expect(data.details.displayName).toBe(validLocation.name);
      expect(data.details.rating).toBeDefined();
    });

    it("should include primary photo from database", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Photos array should contain primary photo if available
      expect(Array.isArray(data.details.photos)).toBe(true);
    });

    it("should return empty reviews array (reviews removed for cost reduction)", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
      const context = {
        params: Promise.resolve({ id: validLocation.id }),
      };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Reviews should be empty (removed to reduce API costs)
      expect(data.details.reviews).toEqual([]);
    });
  });

  describe("Response caching", () => {
    it("should set appropriate cache headers for DB-backed responses", async () => {
      const validLocation = TEST_LOCATIONS.kyotoTemple;
      const request = createMockRequest(`https://example.com/api/locations/${validLocation.id}`);
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
