import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { PATCH } from "@/app/api/trips/[id]/prep-state/route";
import { createMockRequest } from "../utils/mocks";

// Mock rate limit
vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock trip sync service
const mockFetchTripById = vi.fn();

vi.mock("@/services/sync/tripSync", () => ({
  fetchTripById: (...args: unknown[]) => mockFetchTripById(...args),
}));

// Mock auth middleware
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/middleware")>();
  return {
    ...actual,
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  };
});

// Mock Supabase server client
const mockSupabaseUpdate = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      update: (...args: unknown[]) => mockSupabaseUpdate(...args),
    }),
  }),
}));

const mockUserId = "user-123";
const mockTripId = "550e8400-e29b-41d4-a716-446655440000";

function setAuthenticated() {
  mockRequireAuth.mockResolvedValue({
    user: { id: mockUserId },
    context: { requestId: "req-123", ip: "127.0.0.1" },
  });
}

function makePatchRequest(body: unknown, tripId = mockTripId) {
  return createMockRequest(`https://example.com/api/trips/${tripId}/prep-state`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/trips/[id]/prep-state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticated();

    // Default: Supabase update returns no error (chainable eq().eq())
    const chainable = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    mockSupabaseUpdate.mockReturnValue(chainable);

    // Default trip
    mockFetchTripById.mockResolvedValue({
      success: true,
      data: {
        id: mockTripId,
        name: "Test Trip",
        prepState: { "travel-insurance": true },
      },
    });
  });

  it("returns 400 for non-UUID trip id", async () => {
    const request = makePatchRequest(
      { itemId: "passport-validity", checked: true },
      "not-a-uuid",
    );
    const res = await PATCH(request, { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown itemId", async () => {
    const request = makePatchRequest({ itemId: "totally-not-an-item", checked: true });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed body (missing checked)", async () => {
    const request = makePatchRequest({ itemId: "passport-validity" });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when trip not found", async () => {
    mockFetchTripById.mockResolvedValue({ success: true, data: null });
    const request = makePatchRequest({ itemId: "passport-validity", checked: true });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });
    expect(res.status).toBe(404);
  });

  it("returns 500 when fetchTripById fails", async () => {
    mockFetchTripById.mockResolvedValue({ success: false, error: "db down" });
    const request = makePatchRequest({ itemId: "passport-validity", checked: true });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });
    expect(res.status).toBe(500);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    );
    const request = makePatchRequest({ itemId: "passport-validity", checked: true });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });
    expect(res.status).toBe(401);
  });

  it("updates prep_state and returns merged state on success", async () => {
    const request = makePatchRequest({ itemId: "passport-validity", checked: true });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prepState).toEqual({
      "travel-insurance": true,
      "passport-validity": true,
    });
    expect(mockSupabaseUpdate).toHaveBeenCalledWith({
      prep_state: { "travel-insurance": true, "passport-validity": true },
    });
  });

  it("returns 500 when Supabase update errors", async () => {
    mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "write failed" } }),
      }),
    });
    const request = makePatchRequest({ itemId: "passport-validity", checked: true });
    const res = await PATCH(request, { params: Promise.resolve({ id: mockTripId }) });
    expect(res.status).toBe(500);
  });
});
