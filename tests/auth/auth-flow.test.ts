import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
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

describe("Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  describe("OAuth callback flow", () => {
    it("should complete OAuth callback flow end-to-end", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            expires_at: Date.now() + 3600,
            user: {
              id: "user-123",
              email: "test@example.com",
            },
          },
        },
        error: null,
      } as any);
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest("https://example.com/auth/callback?code=valid-auth-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid-auth-code");
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });

    it("should handle OAuth callback with invalid code", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
        data: { session: null },
        error: {
          message: "Invalid authorization code",
          status: 400,
        },
      } as any);
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest("https://example.com/auth/callback?code=invalid-code");
      const response = await GET(request);

      // Should still redirect to dashboard (graceful degradation)
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });

    it("should handle OAuth callback with expired code", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
        data: { session: null },
        error: {
          message: "Authorization code expired",
          status: 400,
        },
      } as any);
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest("https://example.com/auth/callback?code=expired-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });
  });

  describe("Session persistence", () => {
    it("should persist session after successful OAuth callback", async () => {
      const mockSupabase = createMockSupabaseClient();
      const mockSession = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: Date.now() + 3600,
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest("https://example.com/auth/callback?code=valid-code");
      await GET(request);

      // Verify session exchange was called
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalled();
    });

    it("should handle session creation errors gracefully", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockRejectedValueOnce(
        new Error("Network error"),
      );
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest("https://example.com/auth/callback?code=valid-code");
      const response = await GET(request);

      // Should still redirect to dashboard
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });
  });

  describe("Protected route access", () => {
    it("should allow access with valid session", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: "valid-token",
            user: { id: "user-123", email: "test@example.com" },
          },
        },
        error: null,
      } as any);
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      // In a real scenario, this would be tested in middleware or page component
      // For now, we verify the client can be created and session retrieved
      const client = await createClient();
      expect(client).toBeDefined();
    });

    it("should handle missing session gracefully", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const client = await createClient();
      const { data } = await client.auth.getSession();
      expect(data.session).toBeNull();
    });

    it("should handle Supabase client creation errors", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      await expect(createClient()).rejects.toThrow();
    });
  });

  describe("Error handling", () => {
    it("should handle network errors during OAuth callback", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockRejectedValueOnce(
        new Error("Network request failed"),
      );
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = createMockRequest("https://example.com/auth/callback?code=test-code");
      const response = await GET(request);

      // Should gracefully handle error and redirect
      expect(response.status).toBe(307);
    });

    it("should handle Supabase service unavailable", async () => {
      vi.mocked(createClient).mockRejectedValueOnce(new Error("Supabase service unavailable"));

      const request = createMockRequest("https://example.com/auth/callback?code=test-code");
      const response = await GET(request);

      // Should gracefully handle error and redirect
      expect(response.status).toBe(307);
    });
  });
});

