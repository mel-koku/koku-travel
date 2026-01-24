import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/locations/route";
import { createMockRequest } from "../utils/mocks";
import {
  generateRateLimitTests,
  generateCacheHeaderTests,
  expectPaginatedResponse,
} from "../utils/apiTestHelpers";

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
          const countBuilder = createCountQueryBuilder(() => mockSupabaseCountResponse);
          return {
            not: () => ({
              neq: () => ({
                neq: () => countBuilder,
              }),
            }),
          };
        }
        const dataBuilder = createDataQueryBuilder(() => mockSupabaseDataResponse);
        return {
          not: () => ({
            neq: () => ({
              neq: () => dataBuilder,
            }),
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

const apiConfig = {
  baseUrl: "https://example.com/api/locations",
  handler: GET,
  rateLimit: 100,
  cacheMaxAge: 300,
};

describe("GET /api/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseCountResponse = { count: 100, error: null };
    mockSupabaseDataResponse = { data: createMockLocations(20), error: null };
  });

  // Use shared test generators
  generateRateLimitTests(apiConfig);
  generateCacheHeaderTests(apiConfig);

  describe("Pagination", () => {
    it("should return paginated results with default limit", async () => {
      const request = createMockRequest(apiConfig.baseUrl);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expectPaginatedResponse(data, { page: 1, limit: 20, total: 100 });
    });

    it("should respect page parameter", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?page=2`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.page).toBe(2);
    });

    it("should respect limit parameter", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?limit=50`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBe(50);
    });

    it("should cap limit at 100", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?limit=500`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBeLessThanOrEqual(100);
    });

    it("should include hasNext and hasPrev pagination info", async () => {
      mockSupabaseCountResponse = { count: 50, error: null };

      const request = createMockRequest(`${apiConfig.baseUrl}?page=2&limit=20`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expectPaginatedResponse(data, { hasPrev: true, hasNext: true });
    });
  });

  describe("Filtering", () => {
    it("should filter by region", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?region=Kansai`);
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("should filter by category", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?category=food`);
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("should filter by search term", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?search=temple`);
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("should combine multiple filters", async () => {
      const request = createMockRequest(`${apiConfig.baseUrl}?region=Kansai&category=attraction&search=temple`);
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Empty results", () => {
    it("should return empty array when no locations match", async () => {
      mockSupabaseCountResponse = { count: 0, error: null };
      mockSupabaseDataResponse = { data: [], error: null };

      const request = createMockRequest(`${apiConfig.baseUrl}?search=nonexistent`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });
  });

  describe("Response transformation", () => {
    it("should transform database fields to camelCase", async () => {
      const request = createMockRequest(apiConfig.baseUrl);
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

      const request = createMockRequest(apiConfig.baseUrl);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBe(5);
    });

    it("should include prefecture field in response", async () => {
      const request = createMockRequest(apiConfig.baseUrl);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      const location = data.data[0];
      expect(location.prefecture).toBe("Kyoto");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on count query database error", async () => {
      mockSupabaseCountResponse = { count: null, error: { message: "Database connection failed" } };

      const request = createMockRequest(apiConfig.baseUrl);
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 on data query database error", async () => {
      mockSupabaseDataResponse = { data: [], error: { message: "Query timeout" } };

      const request = createMockRequest(apiConfig.baseUrl);
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
});
