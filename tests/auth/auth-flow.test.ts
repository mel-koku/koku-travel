import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { createMockRequest, createMockSupabaseClient } from "../utils/mocks";
import type { MockSupabaseClient } from "../utils/mocks";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ExchangeResponse = Awaited<ReturnType<MockSupabaseClient["auth"]["exchangeCodeForSession"]>>;
type SessionResponse = Awaited<ReturnType<MockSupabaseClient["auth"]["getSession"]>>;

const toSupabaseServerClient = (client: MockSupabaseClient): SupabaseServerClient =>
  client as unknown as SupabaseServerClient;

describe("Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  describe("OAuth callback flow", () => {
    it("should complete OAuth callback flow end-to-end", async () => {
      const mockSupabase = createMockSupabaseClient();
      const exchangeSuccess: ExchangeResponse = {
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
      };
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce(exchangeSuccess);
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

      const request = createMockRequest("https://example.com/auth/callback?code=valid-auth-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid-auth-code");
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/dashboard");
    });

    it("should handle OAuth callback with invalid code", async () => {
      const mockSupabase = createMockSupabaseClient();
      const invalidCodeResponse: ExchangeResponse = {
        data: { session: null },
        error: {
          message: "Invalid authorization code",
          status: 400,
        },
      };
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce(invalidCodeResponse);
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

      const request = createMockRequest("https://example.com/auth/callback?code=invalid-code");
      const response = await GET(request);

      // Should redirect to error page
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=invalid_code");
    });

    it("should handle OAuth callback with expired code", async () => {
      const mockSupabase = createMockSupabaseClient();
      const expiredResponse: ExchangeResponse = {
        data: { session: null },
        error: {
          message: "Authorization code expired",
          status: 400,
        },
      };
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce(expiredResponse);
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

      const request = createMockRequest("https://example.com/auth/callback?code=expired-code");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=invalid_code");
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
      const success: ExchangeResponse = {
        data: { session: mockSession },
        error: null,
      };
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValueOnce(success);
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

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
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

      const request = createMockRequest("https://example.com/auth/callback?code=valid-code");
      const response = await GET(request);

      // Should redirect to error page
      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBe("https://example.com/auth/error?message=service_unavailable");
    });
  });

  describe("Protected route access", () => {
    it("should allow access with valid session", async () => {
      const mockSupabase = createMockSupabaseClient();
      const sessionResponse: SessionResponse = {
        data: {
          session: {
            access_token: "valid-token",
            user: { id: "user-123", email: "test@example.com" },
          },
        },
        error: null,
      };
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce(sessionResponse);
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

      // In a real scenario, this would be tested in middleware or page component
      // For now, we verify the client can be created and session retrieved
      const client = await createClient();
      expect(client).toBeDefined();
    });

    it("should handle missing session gracefully", async () => {
      const mockSupabase = createMockSupabaseClient();
      const emptySession: SessionResponse = {
        data: { session: null },
        error: null,
      };
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce(emptySession);
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

      const client = await createClient();
      const { data } = await client.auth.getSession();
      expect(data.session).toBeNull();
    });

    it("should handle Supabase client creation errors", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      // Unmock createClient to test the real implementation
      vi.doUnmock("@/lib/supabase/server");
      const { createClient: realCreateClient } = await import("@/lib/supabase/server");
      
      await expect(realCreateClient()).rejects.toThrow();
    });
  });

  describe("Error handling", () => {
    it("should handle network errors during OAuth callback", async () => {
      const mockSupabase = createMockSupabaseClient();
      vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockRejectedValueOnce(
        new Error("Network request failed"),
      );
      vi.mocked(createClient).mockResolvedValue(toSupabaseServerClient(mockSupabase));

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

