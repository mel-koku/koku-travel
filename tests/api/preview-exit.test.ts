import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, POST } from "@/app/api/preview/exit/route";
import { draftMode } from "next/headers";
import { createMockRequest } from "../utils/mocks";

// Mock dependencies
vi.mock("next/headers", () => ({
  draftMode: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("GET /api/preview/exit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDraft = {
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: false,
    };
    vi.mocked(draftMode).mockResolvedValue(mockDraft as unknown as Awaited<ReturnType<typeof draftMode>>);
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 30 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/preview/exit");
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Preview token clearing", () => {
    it("should disable draft mode", async () => {
      const mockDraft = {
        enable: vi.fn(),
        disable: vi.fn(),
        isEnabled: false,
      };
      vi.mocked(draftMode).mockResolvedValue(mockDraft as unknown as Awaited<ReturnType<typeof draftMode>>);

      const request = createMockRequest("https://example.com/api/preview/exit");
      await GET(request);

      expect(mockDraft.disable).toHaveBeenCalled();
    });
  });

  describe("Safe redirect handling", () => {
    it("should redirect to home page when no referer", async () => {
      const request = createMockRequest("https://example.com/api/preview/exit");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/");
    });

    it("should redirect to same-origin referer", async () => {
      const request = createMockRequest("https://example.com/api/preview/exit", {
        headers: {
          Referer: "https://example.com/guides/test-guide",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("/guides/test-guide");
    });

    it("should prevent redirect to different origin", async () => {
      const request = createMockRequest("https://example.com/api/preview/exit", {
        headers: {
          Referer: "https://evil.com/malicious",
        },
      });
      const response = await GET(request);

      // Should redirect to home instead
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/");
    });

    it("should prevent redirect to different protocol", async () => {
      const request = createMockRequest("https://example.com/api/preview/exit", {
        headers: {
          Referer: "http://example.com/insecure",
        },
      });
      const response = await GET(request);

      // Should redirect to home instead
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/");
    });
  });
});

describe("POST /api/preview/exit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDraft = {
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: false,
    };
    vi.mocked(draftMode).mockResolvedValue(mockDraft as unknown as Awaited<ReturnType<typeof draftMode>>);
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 30 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/preview/exit", {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("URL size limit", () => {
    it("should return 400 if URL exceeds 1KB", async () => {
      const longPath = "/" + "a".repeat(2000);
      const request = createMockRequest(`https://example.com/api/preview/exit?redirectTo=${longPath}`, {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
      expect(data.error).toContain("Request URL too long");
    });
  });

  describe("Redirect URL validation", () => {
    it("should return 400 for invalid redirect URL format", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview/exit?redirectTo=http://evil.com",
        {
          method: "POST",
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for unsafe redirect URL (path traversal)", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview/exit?redirectTo=../../../etc/passwd",
        {
          method: "POST",
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should accept valid relative redirect URL", async () => {
      const request = createMockRequest(
        "https://example.com/api/preview/exit?redirectTo=/guides/test-guide",
        {
          method: "POST",
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.redirect).toBe("/guides/test-guide");
    });

    it("should return home redirect when no redirectTo parameter", async () => {
      const request = createMockRequest("https://example.com/api/preview/exit", {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.redirect).toBe("/");
    });
  });

  describe("Preview token clearing", () => {
    it("should disable draft mode", async () => {
      const mockDraft = {
        enable: vi.fn(),
        disable: vi.fn(),
        isEnabled: false,
      };
      vi.mocked(draftMode).mockResolvedValue(mockDraft as unknown as Awaited<ReturnType<typeof draftMode>>);

      const request = createMockRequest("https://example.com/api/preview/exit", {
        method: "POST",
      });
      await POST(request);

      expect(mockDraft.disable).toHaveBeenCalled();
    });
  });
});

