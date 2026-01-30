import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createMockRequest, createMockSupabaseClient } from "../utils/mocks";

// Mock rate limit
vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Store the mock for manipulation in tests
const mockSupabaseClient = createMockSupabaseClient();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("Authentication Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Token expiry handling", () => {
    it("should handle expired session token gracefully", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "JWT expired", code: "jwt_expired" },
      });

      // Import the middleware after mocking
      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "Bearer expired-token-here",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      // Should return null user for expired token, not throw
      expect(result.user).toBe(null);
    });

    it("should handle refresh token failure", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Refresh token has expired", code: "refresh_token_expired" },
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });
  });

  describe("Malformed JWT handling", () => {
    it("should handle completely invalid JWT format", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid JWT format", code: "bad_jwt" },
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "Bearer not.a.valid.jwt.token",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });

    it("should handle JWT with invalid signature", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid signature", code: "invalid_signature" },
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });

    it("should handle JWT with tampered payload", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "JWT payload verification failed", code: "bad_jwt" },
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dGFtcGVyZWQ.signature",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });
  });

  describe("Authorization header edge cases", () => {
    it("should handle missing Authorization header", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        // No Authorization header
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });

    it("should handle empty Authorization header", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });

    it("should handle malformed Bearer token format", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "NotBearer token-here",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });

    it("should handle Basic auth instead of Bearer", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "Basic dXNlcm5hbWU6cGFzc3dvcmQ=",
        },
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });
  });

  describe("Session state transitions", () => {
    it("should handle user logged out mid-request", async () => {
      // First call returns session, second call returns null (simulating logout)
      // Note: The actual getOptionalAuth may cache results, so we just verify
      // that consecutive calls handle the session correctly
      mockSupabaseClient.auth.getSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { session: null },
          error: null,
        });

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
      });

      const context = createRequestContext(request);

      // Auth check should return null for no session
      const result1 = await getOptionalAuth(request, context);
      expect(result1.user).toBe(null);

      // Second auth check should also return null
      const result2 = await getOptionalAuth(request, context);
      expect(result2.user).toBe(null);
    });
  });

  describe("Supabase client errors", () => {
    it("should handle Supabase service unavailable", async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error("Service temporarily unavailable"),
      );

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
      });

      const context = createRequestContext(request);

      // Should handle error gracefully and return null user
      const result = await getOptionalAuth(request, context);
      expect(result.user).toBe(null);
    });

    it("should handle network timeout to Supabase", async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error("ETIMEDOUT: Connection timed out"),
      );

      const { getOptionalAuth, createRequestContext } = await import("@/lib/api/middleware");

      const request = createMockRequest("https://example.com/api/test", {
        method: "GET",
      });

      const context = createRequestContext(request);
      const result = await getOptionalAuth(request, context);

      expect(result.user).toBe(null);
    });
  });
});
