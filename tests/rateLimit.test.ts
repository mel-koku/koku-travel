import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit } from "../src/lib/api/rateLimit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Clear environment variables to use in-memory fallback
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  function createMockRequest(ip?: string): NextRequest {
    const headers = new Headers();
    if (ip) {
      headers.set("x-forwarded-for", ip);
    }
    return new NextRequest("https://example.com/api/test", {
      headers,
    });
  }

  describe("checkRateLimit", () => {
    it("should allow requests within limit", async () => {
      const request = createMockRequest("192.168.1.1");
      const config = { maxRequests: 5, windowMs: 1000 };

      // Make 5 requests - all should be allowed
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(request, config);
        expect(result).toBe(null);
      }
    });

    it("should rate limit after exceeding max requests", async () => {
      const request = createMockRequest("192.168.1.2");
      const config = { maxRequests: 2, windowMs: 1000 };

      // First 2 requests should be allowed
      expect(await checkRateLimit(request, config)).toBe(null);
      expect(await checkRateLimit(request, config)).toBe(null);

      // Third request should be rate limited
      const result = await checkRateLimit(request, config);
      expect(result).not.toBe(null);
      if (result) {
        expect(result.status).toBe(429);
        const json = await result.json();
        expect(json.error).toBe("Too many requests");
        expect(json.code).toBe("RATE_LIMIT_EXCEEDED");
      }
    });

    it("should include rate limit headers in response", async () => {
      const request = createMockRequest("192.168.1.3");
      const config = { maxRequests: 1, windowMs: 1000 };

      // First request allowed
      await checkRateLimit(request, config);

      // Second request rate limited
      const result = await checkRateLimit(request, config);
      expect(result).not.toBe(null);
      if (result) {
        expect(result.headers.get("X-RateLimit-Limit")).toBe("1");
        expect(result.headers.get("X-RateLimit-Remaining")).toBe("0");
        expect(result.headers.get("Retry-After")).toBeTruthy();
      }
    });

    it("should handle different IPs independently", async () => {
      const request1 = createMockRequest("192.168.1.10");
      const request2 = createMockRequest("192.168.1.11");
      const config = { maxRequests: 1, windowMs: 1000 };

      // Both IPs should be able to make one request
      expect(await checkRateLimit(request1, config)).toBe(null);
      expect(await checkRateLimit(request2, config)).toBe(null);

      // Both should be rate limited on second request
      const result1 = await checkRateLimit(request1, config);
      const result2 = await checkRateLimit(request2, config);
      expect(result1).not.toBe(null);
      expect(result2).not.toBe(null);
    });

    it("should use default config when not provided", async () => {
      const request = createMockRequest("192.168.1.20");
      // Default is 100 requests per minute
      // Make 100 requests - all should be allowed
      for (let i = 0; i < 100; i++) {
        const result = await checkRateLimit(request);
        expect(result).toBe(null);
      }

      // 101st request should be rate limited
      const result = await checkRateLimit(request);
      expect(result).not.toBe(null);
      if (result) {
        expect(result.status).toBe(429);
      }
    });

    it("should handle requests without IP headers", async () => {
      const request = createMockRequest(); // No IP header
      const config = { maxRequests: 1, windowMs: 1000 };

      // Should still work (uses "unknown" as IP)
      expect(await checkRateLimit(request, config)).toBe(null);
      const result = await checkRateLimit(request, config);
      expect(result).not.toBe(null);
    });
  });
});

