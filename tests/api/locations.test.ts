import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/locations/route";
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
let mockSupabaseCountResponse: { count: number | null; error: unknown } = { count: 100, error: null };
let mockSupabaseDataResponse: { data: unknown[]; error: unknown } = { data: [], error: null };

// Create a thenable object that acts like a Supabase query builder but resolves to the mock response
function createCountQueryBuilder(getResponse: () => { count: number | null; error: unknown }) {
  const builder = {
    eq: () => builder,
    ilike: () => builder,
    then: (resolve: (value: { count: number | null; error: unknown }) => void) => {
      resolve(getResponse());
    },
  };
  return builder;
}

function createDataQueryBuilder(getResponse: () => { data: unknown[]; error: unknown }) {
  const builder = {
    eq: () => builder,
    ilike: () => builder,
    order: () => builder,
    range: () => ({
      then: (resolve: (value: { data: unknown[]; error: unknown }) => void) => {
        resolve(getResponse());
      },
    }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: () => ({
      select: (_columns: string, options?: { count?: string; head?: boolean }) => {
        if (options?.head) {
          // Count query - returns thenable builder
          return {
            not: () => ({
              neq: () => createCountQueryBuilder(() => mockSupabaseCountResponse),
            }),
          };
        }
        // Data query - returns thenable builder
        return {
          not: () => ({
            neq: () => createDataQueryBuilder(() => mockSupabaseDataResponse),
          }),
        };
      },
    }),
  })),
}));

// Helper to create mock location data
function createMockLocations(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `location-${i + 1}`,
    name: `Location ${i + 1}`,
    region: "Kansai",
    city: "Kyoto",
    prefecture: "Kyoto",
    category: "attraction",
    image: `https://example.com/image-${i + 1}.jpg`,
    place_id: `ChIJ-place-${i + 1}`,
    min_budget: 1000,
    estimated_duration: 60,
    short_description: `Description for location ${i + 1}`,
    rating: 4.5,
    review_count: 100,
    primary_photo_url: `https://example.com/photo-${i + 1}.jpg`,
  }));
}

describe("GET /api/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockSupabaseCountResponse = { count: 100, error: null };
    mockSupabaseDataResponse = { data: createMockLocations(20), error: null };
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 100 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Pagination", () => {
    it("should return paginated results with default limit", async () => {
      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.total).toBe(100);
    });

    it("should respect page parameter", async () => {
      const request = createMockRequest("https://example.com/api/locations?page=2");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.page).toBe(2);
    });

    it("should respect limit parameter", async () => {
      const request = createMockRequest("https://example.com/api/locations?limit=50");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBe(50);
    });

    it("should cap limit at 100", async () => {
      const request = createMockRequest("https://example.com/api/locations?limit=500");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBeLessThanOrEqual(100);
    });

    it("should include hasNext and hasPrev pagination info", async () => {
      mockSupabaseCountResponse = { count: 50, error: null };

      const request = createMockRequest("https://example.com/api/locations?page=2&limit=20");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.hasPrev).toBe(true);
      expect(data.pagination.hasNext).toBe(true);
    });
  });

  describe("Filtering", () => {
    it("should filter by region", async () => {
      const request = createMockRequest("https://example.com/api/locations?region=Kansai");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should filter by category", async () => {
      const request = createMockRequest("https://example.com/api/locations?category=food");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should filter by search term", async () => {
      const request = createMockRequest("https://example.com/api/locations?search=temple");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should combine multiple filters", async () => {
      const request = createMockRequest("https://example.com/api/locations?region=Kansai&category=attraction&search=temple");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Empty results", () => {
    it("should return empty array when no locations match", async () => {
      mockSupabaseCountResponse = { count: 0, error: null };
      mockSupabaseDataResponse = { data: [], error: null };

      const request = createMockRequest("https://example.com/api/locations?search=nonexistent");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });
  });

  describe("Response transformation", () => {
    it("should transform database fields to camelCase", async () => {
      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      const location = data.data[0];

      expect(location.minBudget).toBeDefined();
      expect(location.estimatedDuration).toBeDefined();
      expect(location.shortDescription).toBeDefined();
      expect(location.reviewCount).toBeDefined();
      expect(location.placeId).toBeDefined();
      expect(location.primaryPhotoUrl).toBeDefined();
    });

    it("should filter out locations without place_id", async () => {
      const locationsWithMissingPlaceId = [
        ...createMockLocations(5),
        { ...createMockLocations(1)[0], place_id: null },
        { ...createMockLocations(1)[0], place_id: "" },
      ];
      mockSupabaseDataResponse = { data: locationsWithMissingPlaceId, error: null };

      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should only have 5 locations (2 without place_id filtered out)
      expect(data.data.length).toBe(5);
    });

    it("should include prefecture field in response", async () => {
      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      const location = data.data[0];
      expect(location.prefecture).toBe("Kyoto");
    });
  });

  describe("Cache headers", () => {
    it("should set cache headers on successful response", async () => {
      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("max-age=300");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on count query database error", async () => {
      mockSupabaseCountResponse = { count: null, error: { message: "Database connection failed" } };

      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 on data query database error", async () => {
      mockSupabaseDataResponse = { data: [], error: { message: "Query timeout" } };

      const request = createMockRequest("https://example.com/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
});
