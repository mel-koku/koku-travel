import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { createMockRequest, createMockSupabaseClient } from "../utils/mocks";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 30 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }, {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/auth/callback?code=test-code");
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Authorization code handling", () => {
    it("should redirect to error page when code is missing", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://example.com/auth/callback");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=missing_code");
    });

    it("should redirect to error page when code format is invalid", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://example.com/auth/callback?code=invalid@code#format");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=invalid_code");
      // Should not attempt to exchange invalid code
      expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    it("should exchange code for session when code is present", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://example.com/auth/callback?code=test-auth-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("test-auth-code");
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });

    it("should redirect to error page if exchange fails", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: "Invalid code", status: 400 },
      } as { data: { session: null }; error: { message: string; status: number } });
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://example.com/auth/callback?code=invalid-code");
      const response = await GET(request);

      // Should redirect to error page on failure
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=invalid_code");
    });
  });

  describe("Supabase error handling", () => {
    it("should handle Supabase client creation errors gracefully", async () => {
      vi.mocked(createClient).mockRejectedValueOnce(new Error("Supabase client unavailable"));

      const request = createMockRequest("https://example.com/auth/callback?code=test-code");
      const response = await GET(request);

      // Should redirect to error page
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=service_unavailable");
    });

    it("should handle exchange errors gracefully", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockRejectedValueOnce(
        new Error("Network error"),
      );
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://example.com/auth/callback?code=test-code");
      const response = await GET(request);

      // Should redirect to error page
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=service_unavailable");
    });
  });

  describe("Redirect behavior", () => {
    it("should redirect to dashboard on success", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://example.com/auth/callback?code=test-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });

    it("should use correct origin for redirect", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const request = createMockRequest("https://custom-domain.com/auth/callback?code=test-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://custom-domain.com/dashboard");
    });
  });
});

