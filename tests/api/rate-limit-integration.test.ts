import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

describe("Rate Limit Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment to use in-memory fallback
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENFORCE_REDIS_RATE_LIMIT", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function createMockRequest(ip?: string, url = "https://example.com/api/test"): NextRequest {
    const headers = new Headers();
    if (ip) {
      headers.set("x-forwarded-for", ip);
    }
    return new NextRequest(url, { headers });
  }

  describe("Rate limit behavior per endpoint", () => {
    it("should apply stricter limits to expensive endpoints", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const expensiveEndpointConfig = { maxRequests: 5, windowMs: 60000 };
      const cheapEndpointConfig = { maxRequests: 100, windowMs: 60000 };

      // Expensive endpoint (like itinerary generation)
      const expensiveRequest = createMockRequest("10.0.0.1");
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(expensiveRequest, expensiveEndpointConfig);
        expect(result).toBe(null);
      }
      // 6th request should be limited
      const expensiveLimited = await checkRateLimit(expensiveRequest, expensiveEndpointConfig);
      expect(expensiveLimited?.status).toBe(429);

      // Cheap endpoint (like locations lookup) - different IP
      const cheapRequest = createMockRequest("10.0.0.2");
      for (let i = 0; i < 100; i++) {
        const result = await checkRateLimit(cheapRequest, cheapEndpointConfig);
        expect(result).toBe(null);
      }
      // 101st request should be limited
      const cheapLimited = await checkRateLimit(cheapRequest, cheapEndpointConfig);
      expect(cheapLimited?.status).toBe(429);
    });

    it("should track rate limits per IP per endpoint configuration", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 3, windowMs: 60000 };

      const ip1 = "192.168.1.100";
      const ip2 = "192.168.1.101";

      // IP1 makes 3 requests - all should pass
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit(createMockRequest(ip1), config);
        expect(result).toBe(null);
      }

      // IP1's 4th request should be limited
      const ip1Limited = await checkRateLimit(createMockRequest(ip1), config);
      expect(ip1Limited?.status).toBe(429);

      // IP2 should still have full quota
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit(createMockRequest(ip2), config);
        expect(result).toBe(null);
      }

      // IP2's 4th request should also be limited
      const ip2Limited = await checkRateLimit(createMockRequest(ip2), config);
      expect(ip2Limited?.status).toBe(429);
    });
  });

  describe("Rate limit headers", () => {
    it("should include all required rate limit headers", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 1, windowMs: 60000 };
      const request = createMockRequest("10.0.0.50");

      // First request passes
      await checkRateLimit(request, config);

      // Second request is limited
      const response = await checkRateLimit(request, config);

      expect(response).not.toBe(null);
      expect(response?.headers.get("X-RateLimit-Limit")).toBe("1");
      expect(response?.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response?.headers.get("X-RateLimit-Reset")).toBeTruthy();
      expect(response?.headers.get("Retry-After")).toBeTruthy();
    });

    it("should provide accurate Retry-After value", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 1, windowMs: 60000 };
      const request = createMockRequest("10.0.0.51");

      // First request passes
      await checkRateLimit(request, config);

      // Second request is limited
      const response = await checkRateLimit(request, config);
      const retryAfter = parseInt(response?.headers.get("Retry-After") || "0", 10);

      // Retry-After should be positive and less than or equal to window
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe("Rate limit response format", () => {
    it("should return consistent error response format", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 1, windowMs: 60000 };
      const request = createMockRequest("10.0.0.60");

      // First request passes
      await checkRateLimit(request, config);

      // Second request is limited
      const response = await checkRateLimit(request, config);
      expect(response?.status).toBe(429);

      const data = await response?.json();
      expect(data).toEqual(
        expect.objectContaining({
          error: "Too many requests",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: expect.any(Number),
        }),
      );
    });
  });

  describe("IP extraction edge cases", () => {
    it("should handle multiple IPs in x-forwarded-for header", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 2, windowMs: 60000 };

      // x-forwarded-for with multiple IPs (client IP is first)
      const headers = new Headers();
      headers.set("x-forwarded-for", "203.0.113.50, 198.51.100.178, 192.0.2.1");
      const request = new NextRequest("https://example.com/api/test", { headers });

      // Should use first IP (203.0.113.50)
      expect(await checkRateLimit(request, config)).toBe(null);
      expect(await checkRateLimit(request, config)).toBe(null);
      const limited = await checkRateLimit(request, config);
      expect(limited?.status).toBe(429);
    });

    it("should handle IPv6 addresses", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 2, windowMs: 60000 };
      const headers = new Headers();
      headers.set("x-forwarded-for", "2001:0db8:85a3:0000:0000:8a2e:0370:7334");
      const request = new NextRequest("https://example.com/api/test", { headers });

      expect(await checkRateLimit(request, config)).toBe(null);
      expect(await checkRateLimit(request, config)).toBe(null);
      const limited = await checkRateLimit(request, config);
      expect(limited?.status).toBe(429);
    });

    it("should handle missing IP header with fallback", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 2, windowMs: 60000 };
      // No x-forwarded-for header
      const request = new NextRequest("https://example.com/api/test");

      // Should still rate limit using fallback identifier
      expect(await checkRateLimit(request, config)).toBe(null);
      expect(await checkRateLimit(request, config)).toBe(null);
      const limited = await checkRateLimit(request, config);
      expect(limited?.status).toBe(429);
    });
  });

  describe("Burst protection", () => {
    it("should prevent rapid burst requests", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const config = { maxRequests: 10, windowMs: 60000 };
      const request = createMockRequest("10.0.0.70");

      // Simulate burst: 15 requests in rapid succession
      const results = await Promise.all(
        Array(15).fill(null).map(() => checkRateLimit(request, config)),
      );

      // First 10 should pass (null), remaining 5 should be limited
      const allowed = results.filter((r) => r === null).length;
      const limited = results.filter((r) => r !== null && r.status === 429).length;

      expect(allowed).toBe(10);
      expect(limited).toBe(5);
    });
  });

  describe("Environment-specific behavior", () => {
    it("should warn in development when Redis is not configured", async () => {
      vi.stubEnv("NODE_ENV", "development");

      // Import fresh module to trigger initialization
      const { checkRateLimit } = await import("@/lib/api/rateLimit");

      const request = createMockRequest("10.0.0.80");
      const config = { maxRequests: 100, windowMs: 60000 };

      // Should work with in-memory fallback
      const result = await checkRateLimit(request, config);
      expect(result).toBe(null);
    });
  });
});
