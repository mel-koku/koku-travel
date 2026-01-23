import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import { createMockRequest } from "./mocks";

/**
 * Common API test patterns for rate limiting, caching, and error handling.
 * Use these helpers to reduce duplication across API tests.
 */

type ApiHandler = (request: Request) => Promise<Response>;

interface ApiTestConfig {
  /** Base URL for the API endpoint */
  baseUrl: string;
  /** The API handler function (GET, POST, etc.) */
  handler: ApiHandler;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
  /** Expected cache max-age in seconds */
  cacheMaxAge?: number;
}

/**
 * Generate rate limiting tests for an API endpoint
 */
export function generateRateLimitTests(config: ApiTestConfig) {
  const { baseUrl, handler, rateLimit = 100 } = config;

  describe("Rate limiting", () => {
    it(`should enforce rate limit of ${rateLimit} requests per minute`, async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json(
          { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
          { status: 429 }
        )
      );

      const request = createMockRequest(baseUrl);
      const response = await handler(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });
}

/**
 * Generate cache header tests for an API endpoint
 */
export function generateCacheHeaderTests(config: ApiTestConfig) {
  const { baseUrl, handler, cacheMaxAge = 300 } = config;

  describe("Cache headers", () => {
    it("should set cache headers on successful response", async () => {
      const request = createMockRequest(baseUrl);
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain(`max-age=${cacheMaxAge}`);
    });
  });
}

/**
 * Generate database error handling tests for an API endpoint
 */
export function generateDatabaseErrorTests(
  config: ApiTestConfig,
  setupDbError: () => void
) {
  const { baseUrl, handler } = config;

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      setupDbError();

      const request = createMockRequest(baseUrl);
      const response = await handler(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
}

/**
 * Generate empty results tests for an API endpoint
 */
export function generateEmptyResultsTests(
  config: ApiTestConfig,
  setupEmptyResults: () => void,
  options?: { expectedDataKey?: string }
) {
  const { baseUrl, handler } = config;
  const { expectedDataKey = "data" } = options || {};

  describe("Empty results", () => {
    it("should return empty array when no results match", async () => {
      setupEmptyResults();

      const request = createMockRequest(baseUrl);
      const response = await handler(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json[expectedDataKey]).toEqual([]);
    });
  });
}

/**
 * Common mock setup patterns for API tests
 */
export const apiMocks = {
  /**
   * Create standard rate limit mock
   */
  rateLimit: () => ({
    checkRateLimit: vi.fn().mockResolvedValue(null),
  }),

  /**
   * Create standard middleware mock
   */
  middleware: () => ({
    createRequestContext: vi.fn().mockReturnValue({
      requestId: "test-request-id",
      startTime: Date.now(),
    }),
    addRequestContextHeaders: vi.fn((response: Response) => response),
    getOptionalAuth: vi.fn().mockResolvedValue({
      user: null,
      context: { requestId: "test-request-id" },
    }),
  }),
};

/**
 * Standard test assertions for paginated API responses
 */
export function expectPaginatedResponse(
  data: {
    data: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext?: boolean;
      hasPrev?: boolean;
    };
  },
  expectations: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  }
) {
  expect(data.data).toBeDefined();
  expect(data.pagination).toBeDefined();

  if (expectations.page !== undefined) {
    expect(data.pagination.page).toBe(expectations.page);
  }
  if (expectations.limit !== undefined) {
    expect(data.pagination.limit).toBe(expectations.limit);
  }
  if (expectations.total !== undefined) {
    expect(data.pagination.total).toBe(expectations.total);
  }
  if (expectations.hasNext !== undefined) {
    expect(data.pagination.hasNext).toBe(expectations.hasNext);
  }
  if (expectations.hasPrev !== undefined) {
    expect(data.pagination.hasPrev).toBe(expectations.hasPrev);
  }
}

/**
 * Standard test assertions for meta response format
 */
export function expectMetaResponse(
  data: { data: unknown[]; meta: { total: number } },
  expectations: { total?: number }
) {
  expect(data.data).toBeDefined();
  expect(Array.isArray(data.data)).toBe(true);
  expect(data.meta).toBeDefined();

  if (expectations.total !== undefined) {
    expect(data.meta.total).toBe(expectations.total);
  }
}
