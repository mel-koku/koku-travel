import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/cities/route";
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
}));

// Mock Supabase client
let mockSupabaseResponse: { data: unknown[]; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: () => ({
      select: () => ({
        not: () => ({
          neq: () => ({
            order: () => Promise.resolve(mockSupabaseResponse),
          }),
        }),
      }),
    }),
  })),
}));

// Helper to create mock location data for city aggregation
function createMockLocationData() {
  return [
    {
      id: "kyoto-kinkakuji",
      city: "Kyoto",
      region: "Kansai",
      place_id: "ChIJ-place-1",
      image: "https://example.com/kinkakuji.jpg",
      rating: 4.8,
    },
    {
      id: "kyoto-fushimi",
      city: "Kyoto",
      region: "Kansai",
      place_id: "ChIJ-place-2",
      image: "https://example.com/fushimi.jpg",
      rating: 4.7,
    },
    {
      id: "kyoto-temple",
      city: "Kyoto",
      region: "Kansai",
      place_id: "ChIJ-place-3",
      image: "https://example.com/temple.jpg",
      rating: 4.6,
    },
    {
      id: "kyoto-garden",
      city: "Kyoto",
      region: "Kansai",
      place_id: "ChIJ-place-4",
      image: null,
      rating: 4.5,
    },
    {
      id: "osaka-castle",
      city: "Osaka",
      region: "Kansai",
      place_id: "ChIJ-place-5",
      image: "https://example.com/osaka-castle.jpg",
      rating: 4.6,
    },
    {
      id: "osaka-dotonbori",
      city: "Osaka",
      region: "Kansai",
      place_id: "ChIJ-place-6",
      image: "https://example.com/dotonbori.jpg",
      rating: 4.5,
    },
    {
      id: "tokyo-senso",
      city: "Tokyo",
      region: "Kanto",
      place_id: "ChIJ-place-7",
      image: "https://example.com/senso.jpg",
      rating: 4.7,
    },
  ];
}

describe("GET /api/cities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseResponse = { data: createMockLocationData(), error: null };
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("City aggregation", () => {
    it("should return cities with location counts", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);

      const kyoto = data.data.find((c: { name: string }) => c.name === "Kyoto");
      expect(kyoto).toBeDefined();
      expect(kyoto.locationCount).toBe(4);

      const osaka = data.data.find((c: { name: string }) => c.name === "Osaka");
      expect(osaka).toBeDefined();
      expect(osaka.locationCount).toBe(2);

      const tokyo = data.data.find((c: { name: string }) => c.name === "Tokyo");
      expect(tokyo).toBeDefined();
      expect(tokyo.locationCount).toBe(1);
    });

    it("should include region for each city", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const kyoto = data.data.find((c: { name: string }) => c.name === "Kyoto");
      expect(kyoto.region).toBe("Kansai");

      const tokyo = data.data.find((c: { name: string }) => c.name === "Tokyo");
      expect(tokyo.region).toBe("Kanto");
    });

    it("should generate id from city name", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const kyoto = data.data.find((c: { name: string }) => c.name === "Kyoto");
      expect(kyoto.id).toBe("kyoto");

      const tokyo = data.data.find((c: { name: string }) => c.name === "Tokyo");
      expect(tokyo.id).toBe("tokyo");
    });
  });

  describe("Preview images", () => {
    it("should include up to 3 preview images for each city", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const kyoto = data.data.find((c: { name: string }) => c.name === "Kyoto");
      expect(kyoto.previewImages).toBeDefined();
      expect(Array.isArray(kyoto.previewImages)).toBe(true);
      expect(kyoto.previewImages.length).toBeLessThanOrEqual(3);
    });

    it("should use image field when available", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const kyoto = data.data.find((c: { name: string }) => c.name === "Kyoto");
      // First 3 locations have images
      expect(kyoto.previewImages).toContain("https://example.com/kinkakuji.jpg");
    });

    it("should fallback to primary-photo API when no image", async () => {
      // Mock data where some locations have no image
      mockSupabaseResponse = {
        data: [
          {
            id: "nara-park",
            city: "Nara",
            region: "Kansai",
            place_id: "ChIJ-place-nara",
            image: null,
            rating: 4.5,
          },
        ],
        error: null,
      };

      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const nara = data.data.find((c: { name: string }) => c.name === "Nara");
      expect(nara.previewImages[0]).toContain("/api/locations/nara-park/primary-photo");
    });
  });

  describe("Sorting by count", () => {
    it("should sort cities by location count in descending order", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const counts = data.data.map((c: { locationCount: number }) => c.locationCount);
      const sortedCounts = [...counts].sort((a, b) => b - a);
      expect(counts).toEqual(sortedCounts);
    });
  });

  describe("Response format", () => {
    it("should return data in standardized API response format", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should have data array
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);

      // Should have meta object
      expect(data.meta).toBeDefined();
      expect(data.meta.total).toBe(3); // 3 unique cities
    });
  });

  describe("Cache headers", () => {
    it("should set cache headers on successful response", async () => {
      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("max-age=300");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      mockSupabaseResponse = { data: [], error: { message: "Database connection failed" } };

      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should handle empty database gracefully", async () => {
      mockSupabaseResponse = { data: [], error: null };

      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual([]);
      expect(data.meta.total).toBe(0);
    });

    it("should skip locations without city or region", async () => {
      mockSupabaseResponse = {
        data: [
          {
            id: "location-1",
            city: null,
            region: "Kansai",
            place_id: "ChIJ-place-1",
            image: null,
            rating: 4.5,
          },
          {
            id: "location-2",
            city: "Kyoto",
            region: null,
            place_id: "ChIJ-place-2",
            image: null,
            rating: 4.5,
          },
          {
            id: "location-3",
            city: "Osaka",
            region: "Kansai",
            place_id: "ChIJ-place-3",
            image: null,
            rating: 4.5,
          },
        ],
        error: null,
      };

      const request = createMockRequest("https://example.com/api/cities");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should only have Osaka (location-3 is the only one with both city and region)
      expect(data.data.length).toBe(1);
      expect(data.data[0].name).toBe("Osaka");
    });
  });
});
