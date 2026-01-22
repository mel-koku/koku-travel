import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/locations/filter-options/route";
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

// Mock Supabase client
let mockSupabaseResponse: { data: unknown[]; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: () => ({
      select: () => ({
        not: () => ({
          neq: () => ({
            select: () => Promise.resolve(mockSupabaseResponse),
          }),
        }),
      }),
    }),
  })),
}));

// Helper to create mock location data for aggregation
function createMockAggregationData() {
  return [
    { city: "Kyoto", category: "attraction", region: "Kansai", prefecture: "Kyoto" },
    { city: "Kyoto", category: "attraction", region: "Kansai", prefecture: "Kyoto" },
    { city: "Kyoto", category: "food", region: "Kansai", prefecture: "Kyoto" },
    { city: "Osaka", category: "attraction", region: "Kansai", prefecture: "Osaka" },
    { city: "Osaka", category: "food", region: "Kansai", prefecture: "Osaka" },
    { city: "Tokyo", category: "attraction", region: "Kanto", prefecture: "Tokyo Prefecture" },
    { city: "Tokyo", category: "nature", region: "Kanto", prefecture: "Tokyo Prefecture" },
    { city: "Nara", category: "attraction", region: "Kansai", prefecture: "Nara" },
  ];
}

describe("GET /api/locations/filter-options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseResponse = { data: createMockAggregationData(), error: null };
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Aggregation response", () => {
    it("should return cities with counts", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.cities).toBeDefined();
      expect(Array.isArray(data.cities)).toBe(true);

      const kyoto = data.cities.find((c: { value: string }) => c.value === "Kyoto");
      expect(kyoto).toBeDefined();
      expect(kyoto.count).toBe(3); // 3 Kyoto locations in mock data
    });

    it("should return categories with counts", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.categories).toBeDefined();
      expect(Array.isArray(data.categories)).toBe(true);

      const attraction = data.categories.find((c: { value: string }) => c.value === "attraction");
      expect(attraction).toBeDefined();
      expect(attraction.count).toBe(5); // 5 attraction locations in mock data
    });

    it("should return regions with counts", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.regions).toBeDefined();
      expect(Array.isArray(data.regions)).toBe(true);

      const kansai = data.regions.find((r: { value: string }) => r.value === "Kansai");
      expect(kansai).toBeDefined();
      expect(kansai.count).toBe(6); // 6 Kansai locations in mock data
    });

    it("should return prefectures with counts", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.prefectures).toBeDefined();
      expect(Array.isArray(data.prefectures)).toBe(true);

      const kyotoPref = data.prefectures.find((p: { value: string }) => p.value === "Kyoto");
      expect(kyotoPref).toBeDefined();
      expect(kyotoPref.count).toBe(3);
    });
  });

  describe("Prefecture normalization", () => {
    it("should remove Prefecture suffix from prefecture names", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // "Tokyo Prefecture" should be normalized to "Tokyo"
      const tokyo = data.prefectures.find((p: { value: string }) => p.value === "Tokyo");
      expect(tokyo).toBeDefined();
      expect(tokyo.count).toBe(2); // 2 Tokyo locations in mock data

      // Should not have "Tokyo Prefecture" as a separate entry
      const tokyoPrefecture = data.prefectures.find(
        (p: { value: string }) => p.value === "Tokyo Prefecture"
      );
      expect(tokyoPrefecture).toBeUndefined();
    });

    it("should aggregate counts for normalized prefectures", async () => {
      // Add more data with mixed prefecture naming
      mockSupabaseResponse = {
        data: [
          { city: "Shibuya", category: "attraction", region: "Kanto", prefecture: "Tokyo" },
          { city: "Shinjuku", category: "food", region: "Kanto", prefecture: "Tokyo Prefecture" },
          { city: "Ginza", category: "shopping", region: "Kanto", prefecture: "Tokyo" },
        ],
        error: null,
      };

      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // All should be aggregated under "Tokyo"
      const tokyo = data.prefectures.find((p: { value: string }) => p.value === "Tokyo");
      expect(tokyo).toBeDefined();
      expect(tokyo.count).toBe(3);
    });
  });

  describe("Cache headers", () => {
    it("should set 1-hour cache headers", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
    });

    it("should include stale-while-revalidate directive", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("stale-while-revalidate");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      mockSupabaseResponse = { data: [], error: { message: "Database connection failed" } };

      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should handle empty database gracefully", async () => {
      mockSupabaseResponse = { data: [], error: null };

      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.cities).toEqual([]);
      expect(data.categories).toEqual([]);
      expect(data.regions).toEqual([]);
      expect(data.prefectures).toEqual([]);
    });
  });

  describe("Response sorting", () => {
    it("should sort filter options alphabetically by label", async () => {
      const request = createMockRequest("https://example.com/api/locations/filter-options");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Check cities are sorted
      const cityLabels = data.cities.map((c: { label: string }) => c.label);
      const sortedCityLabels = [...cityLabels].sort();
      expect(cityLabels).toEqual(sortedCityLabels);

      // Check regions are sorted
      const regionLabels = data.regions.map((r: { label: string }) => r.label);
      const sortedRegionLabels = [...regionLabels].sort();
      expect(regionLabels).toEqual(sortedRegionLabels);
    });
  });
});
