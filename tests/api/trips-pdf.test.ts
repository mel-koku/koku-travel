import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/trips/[id]/pdf/route";
import { createMockRequest } from "../utils/mocks";

// Mock rate limiter to always allow
vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock the trip-fetch service
const mockFetchTripById = vi.fn();
vi.mock("@/services/sync/tripSync", () => ({
  fetchTripById: (...args: unknown[]) => mockFetchTripById(...args),
  saveTrip: vi.fn(),
  deleteTrip: vi.fn(),
}));

// Mock auth middleware — preserve other exports
const mockRequireAuth = vi.fn();
vi.mock("@/lib/api/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/middleware")>();
  return {
    ...actual,
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  };
});

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

// Mock the Chromium launcher — must never actually launch a browser in CI.
// If this mock's getBrowser() is called, the test has gone further than intended.
vi.mock("@/lib/pdf/browser", () => ({
  getBrowser: vi.fn(async () => {
    throw new Error("getBrowser should not be invoked in these tests");
  }),
}));

const mockUserId = "user-123";
const mockTripId = "550e8400-e29b-41d4-a716-446655440000";
const mockTrip = {
  id: mockTripId,
  name: "Kyoto Trip",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  itinerary: { days: [] },
  builderData: {},
};

function makePdfRequest(tripId: string) {
  return createMockRequest(`https://example.com/api/trips/${tripId}/pdf`, {
    method: "POST",
  });
}

function makeRouteProps(tripId: string) {
  return { params: Promise.resolve({ id: tripId }) };
}

describe("POST /api/trips/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PDF_TOKEN_SECRET", "a".repeat(64));
    mockRequireAuth.mockResolvedValue({
      user: { id: mockUserId },
      context: { requestId: "req-123", ip: "127.0.0.1" },
    });
    mockFetchTripById.mockResolvedValue({ success: true, data: mockTrip });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("configuration", () => {
    it("returns 503 when PDF_TOKEN_SECRET is not configured", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("PDF_TOKEN_SECRET", "");

      const res = await POST(makePdfRequest(mockTripId), makeRouteProps(mockTripId));

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toMatch(/not configured/i);
    });
  });

  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      // requireAuth returns a NextResponse when unauth — mirror what the
      // real middleware does. Use a 401 Response.
      const { NextResponse } = await import("next/server");
      mockRequireAuth.mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );

      const res = await POST(makePdfRequest(mockTripId), makeRouteProps(mockTripId));

      expect(res.status).toBe(401);
    });
  });

  describe("ownership", () => {
    it("returns 404 when trip is not found for this user", async () => {
      mockFetchTripById.mockResolvedValue({ success: true, data: null });

      const res = await POST(makePdfRequest(mockTripId), makeRouteProps(mockTripId));

      expect(res.status).toBe(404);
    });

    it("returns 404 when fetchTripById fails", async () => {
      mockFetchTripById.mockResolvedValue({ success: false, error: "db error" });

      const res = await POST(makePdfRequest(mockTripId), makeRouteProps(mockTripId));

      expect(res.status).toBe(404);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const { NextResponse } = await import("next/server");
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
      );

      const res = await POST(makePdfRequest(mockTripId), makeRouteProps(mockTripId));

      expect(res.status).toBe(429);
    });
  });
});
