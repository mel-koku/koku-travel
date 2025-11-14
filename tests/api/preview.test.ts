import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/preview/route";
import { draftMode } from "next/headers";
import { createMockRequest } from "../utils/mocks";

// Mock dependencies
vi.mock("next/headers", () => ({
  draftMode: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("GET /api/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env var before tests run
    process.env.SANITY_PREVIEW_SECRET = "test-secret-123";
    vi.mocked(draftMode).mockReturnValue({
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: false,
    } as any);
  });

  afterEach(() => {
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

      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=test-guide",
      );
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Secret validation", () => {
    it("should return 500 if preview secret is not configured", async () => {
      const originalSecret = process.env.SANITY_PREVIEW_SECRET;
      delete process.env.SANITY_PREVIEW_SECRET;
      // Re-import to pick up the change
      vi.resetModules();
      const { GET: GETHandler } = await import("@/app/api/preview/route");

      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=test-guide",
      );
      const response = await GETHandler(request);
      
      // Restore for other tests
      process.env.SANITY_PREVIEW_SECRET = originalSecret;

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
      expect(data.error).toContain("Preview secret is not configured");
    });

    it("should return 400 for missing secret parameter", async () => {
      const request = createMockRequest("https://example.com/api/preview?slug=test-guide");
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Invalid secret parameter format");
    });

    it("should return 401 for invalid secret", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=wrong-secret&slug=test-guide",
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
      expect(data.error).toContain("Invalid preview secret");
    });
  });

  describe("Slug validation", () => {
    it("should return 400 for missing slug parameter", async () => {
      const request = createMockRequest("https://example.com/api/preview?secret=test-secret-123");
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Missing slug parameter");
    });

    it("should return 400 for invalid slug (path traversal)", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=../../../etc/passwd",
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid slug (special characters)", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=test<script>alert(1)</script>",
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should accept valid slug", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=test-guide",
      );
      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get("Location")).toContain("/test-guide");
    });
  });

  describe("Preview mode", () => {
    it("should enable draft mode on valid request", async () => {
      const mockDraft = {
        enable: vi.fn(),
        disable: vi.fn(),
        isEnabled: false,
      };
      vi.mocked(draftMode).mockReturnValue(mockDraft as any);

      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=test-guide",
      );
      await GET(request);

      expect(mockDraft.enable).toHaveBeenCalled();
    });
  });

  describe("Open redirect prevention", () => {
    it("should redirect to safe relative path", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=/guides/test-guide",
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("/guides/test-guide");
      // Location header includes full URL, but path should be safe
      const locationUrl = new URL(location!);
      expect(locationUrl.pathname).toBe("/guides/test-guide");
    });

    it("should prevent redirect to external URLs", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=http://evil.com",
      );
      const response = await GET(request);

      // Should reject the slug as invalid
      expect(response.status).toBe(400);
    });

    it("should prevent redirect to javascript: URLs", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview?secret=test-secret-123&slug=javascript:alert(1)",
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });
});

