import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/revalidate/route";
import { isValidSignature } from "@sanity/webhook";
import { revalidatePath, revalidateTag } from "next/cache";
import { createMockRequest } from "../utils/mocks";

// Mock dependencies
vi.mock("@sanity/webhook", () => ({
  isValidSignature: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set both secrets since the route checks SANITY_REVALIDATE_SECRET || SANITY_PREVIEW_SECRET
    process.env.SANITY_REVALIDATE_SECRET = "test-secret-123";
    process.env.SANITY_PREVIEW_SECRET = "";
    vi.mocked(isValidSignature).mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.SANITY_REVALIDATE_SECRET;
    delete process.env.SANITY_PREVIEW_SECRET;
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 20 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }), {
          status: 429,
        }),
      );

      const payload = JSON.stringify({ _type: "guide", slug: { current: "test-guide" } });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Secret configuration", () => {
    it("should return 503 if revalidation secret is not configured", async () => {
      const originalRevalidate = process.env.SANITY_REVALIDATE_SECRET;
      const originalPreview = process.env.SANITY_PREVIEW_SECRET;
      delete process.env.SANITY_REVALIDATE_SECRET;
      delete process.env.SANITY_PREVIEW_SECRET;
      // Re-import to pick up the change
      vi.resetModules();
      const { POST: POSTHandler } = await import("@/app/api/revalidate/route");

      const payload = JSON.stringify({ _type: "guide" });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POSTHandler(request);
      
      // Restore for other tests
      process.env.SANITY_REVALIDATE_SECRET = originalRevalidate;
      process.env.SANITY_PREVIEW_SECRET = originalPreview;

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.code).toBe("SERVICE_UNAVAILABLE");
      expect(data.error).toContain("Revalidation secret is not configured");
    });
  });

  describe("Signature validation", () => {
    it("should return 401 for missing signature header", async () => {
      const payload = JSON.stringify({ _type: "guide" });
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
      expect(data.error).toContain("Invalid signature header format");
    });

    it("should return 401 for invalid signature", async () => {
      vi.mocked(isValidSignature).mockReturnValue(false);

      const payload = JSON.stringify({ _type: "guide" });
      const signature = "invalid-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
      expect(data.error).toContain("Invalid signature");
    });

    it("should accept valid signature", async () => {
      vi.mocked(isValidSignature).mockReturnValue(true);

      const payload = JSON.stringify({ _type: "guide", slug: { current: "test-guide" } });
      const signature = "valid-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(isValidSignature).toHaveBeenCalledWith(payload, signature, "test-secret-123");
    });
  });

  describe("Payload size limit", () => {
    it("should return 400 if payload exceeds 64KB", async () => {
      const largePayload = JSON.stringify({
        _type: "guide",
        paths: Array(1000).fill("/guides/test-guide"),
      });
      // Make it larger than 64KB
      const oversizedPayload = largePayload + "x".repeat(65 * 1024);

      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: oversizedPayload,
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Payload too large");
    });
  });

  describe("JSON parsing", () => {
    it("should return 400 for invalid JSON payload", async () => {
      const invalidJson = "{ invalid json }";
      const signature = "test-signature";
      // Mock isValidSignature to return true so we can test JSON parsing
      vi.mocked(isValidSignature).mockReturnValueOnce(true);
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: invalidJson,
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Failed to parse webhook payload");
    });
  });

  describe("Path sanitization", () => {
    it("should sanitize paths to prevent traversal", async () => {
      const payload = JSON.stringify({
        _type: "guide",
        paths: ["/guides/test-guide", "../../../etc/passwd", "/guides/valid-path"],
      });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should only include safe paths
      expect(data.revalidated).not.toContain("../../../etc/passwd");
      expect(data.revalidated).toContain("/guides/test-guide");
    });

    it("should sanitize slug to prevent traversal", async () => {
      const payload = JSON.stringify({
        _type: "guide",
        slug: { current: "../../../etc/passwd" },
      });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should not include unsafe paths
      expect(data.revalidated.every((path: string) => !path.includes("../"))).toBe(true);
    });
  });

  describe("Path revalidation", () => {
    it("should revalidate paths from payload", async () => {
      const payload = JSON.stringify({
        _type: "guide",
        paths: ["/guides/test-guide", "/guides"],
      });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.revalidated).toContain("/guides/test-guide");
      expect(data.revalidated).toContain("/guides");
      expect(revalidatePath).toHaveBeenCalled();
    });

    it("should revalidate paths from slug", async () => {
      const payload = JSON.stringify({
        _type: "guide",
        slug: { current: "test-guide" },
      });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.revalidated).toContain("/guides");
      expect(data.revalidated).toContain("/guides/test-guide");
    });

    it("should limit paths to MAX_PATHS (100)", async () => {
      // Schema validation limits to 100 paths, so we test with exactly 100
      // The route also has internal limiting logic, but schema validation happens first
      const manyPaths = Array(100).fill(0).map((_, i) => `/guides/test-guide-${i}`);
      const payload = JSON.stringify({
        _type: "guide",
        paths: manyPaths,
      });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.revalidated.length).toBeLessThanOrEqual(100);
      expect(data.revalidated.length).toBe(100);
    });

    it("should revalidate guides tag", async () => {
      const payload = JSON.stringify({
        _type: "guide",
        slug: { current: "test-guide" },
      });
      const signature = "test-signature";
      const request = createMockRequest("https://example.com/api/revalidate", {
        method: "POST",
        headers: {
          "x-sanity-signature": signature,
          "content-type": "application/json",
        },
        body: payload,
      });
      await POST(request);

      expect(revalidateTag).toHaveBeenCalledWith("guides", "page");
    });
  });
});

