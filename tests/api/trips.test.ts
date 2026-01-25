import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/trips/[id]/route";
import { createMockRequest } from "../utils/mocks";

// Mock dependencies
vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock trip sync service
const mockFetchTripById = vi.fn();
const mockSaveTrip = vi.fn();
const mockDeleteTrip = vi.fn();

vi.mock("@/services/sync/tripSync", () => ({
  fetchTripById: (...args: unknown[]) => mockFetchTripById(...args),
  saveTrip: (...args: unknown[]) => mockSaveTrip(...args),
  deleteTrip: (...args: unknown[]) => mockDeleteTrip(...args),
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
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

const mockUserId = "user-123";
const mockTripId = "550e8400-e29b-41d4-a716-446655440000";
const mockTrip = {
  id: mockTripId,
  name: "Tokyo Trip",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  itinerary: {
    days: [
      {
        id: "day-1",
        dateLabel: "Day 1",
        activities: [
          {
            kind: "place" as const,
            id: "activity-1",
            title: "Visit Temple",
            timeOfDay: "morning" as const,
          },
        ],
      },
    ],
  },
  builderData: {},
};

describe("GET /api/trips/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user
    mockRequireAuth.mockResolvedValue({
      user: { id: mockUserId },
      context: { requestId: "req-123", ip: "127.0.0.1" },
    });
    // Default: trip found
    mockFetchTripById.mockResolvedValue({
      success: true,
      data: mockTrip,
    });
  });

  describe("Rate limiting", () => {
    it("should return 429 when rate limit is exceeded", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        NextResponse.json(
          { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
          { status: 429 }
        )
      );

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`);
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await GET(request, context);

      expect(response.status).toBe(429);
    });
  });

  describe("Trip ID validation", () => {
    it("should return 400 for invalid UUID format", async () => {
      const request = createMockRequest("https://example.com/api/trips/not-a-uuid");
      const context = { params: Promise.resolve({ id: "not-a-uuid" }) };
      const response = await GET(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid trip ID format");
    });

    it("should accept valid UUID", async () => {
      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`);
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
    });
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      mockRequireAuth.mockResolvedValueOnce(
        NextResponse.json(
          { error: "Authentication required", code: "UNAUTHORIZED" },
          { status: 401 }
        )
      );

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`);
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await GET(request, context);

      expect(response.status).toBe(401);
    });
  });

  describe("Trip retrieval", () => {
    it("should return trip when found", async () => {
      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`);
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.trip).toEqual(mockTrip);
    });

    it("should return 404 when trip not found", async () => {
      mockFetchTripById.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`);
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("Trip not found");
    });

    it("should return 500 on service error", async () => {
      mockFetchTripById.mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`);
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await GET(request, context);

      expect(response.status).toBe(500);
    });
  });
});

describe("PATCH /api/trips/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      user: { id: mockUserId },
      context: { requestId: "req-123", ip: "127.0.0.1" },
    });
    mockFetchTripById.mockResolvedValue({
      success: true,
      data: mockTrip,
    });
    mockSaveTrip.mockResolvedValue({
      success: true,
      data: mockTrip,
    });
  });

  describe("Request body validation", () => {
    it("should return 400 when no updates provided", async () => {
      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("No updates provided");
    });

    it("should accept valid name update", async () => {
      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Trip Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
    });

    it("should reject invalid name (too short)", async () => {
      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
    });
  });

  describe("Itinerary validation", () => {
    it("should accept valid itinerary update", async () => {
      const validItinerary = {
        days: [
          {
            id: "day-1",
            activities: [
              {
                kind: "place",
                id: "act-1",
                title: "Visit Park",
                timeOfDay: "afternoon",
              },
            ],
          },
        ],
      };

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ itinerary: validItinerary }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
    });

    it("should reject invalid activity kind", async () => {
      const invalidItinerary = {
        days: [
          {
            id: "day-1",
            activities: [
              {
                kind: "invalid",
                id: "act-1",
                title: "Test",
                timeOfDay: "morning",
              },
            ],
          },
        ],
      };

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ itinerary: invalidItinerary }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
    });

    it("should reject invalid timeOfDay", async () => {
      const invalidItinerary = {
        days: [
          {
            id: "day-1",
            activities: [
              {
                kind: "place",
                id: "act-1",
                title: "Test",
                timeOfDay: "midnight",
              },
            ],
          },
        ],
      };

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ itinerary: invalidItinerary }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
    });
  });

  describe("Trip update", () => {
    it("should return 404 when trip not found", async () => {
      mockFetchTripById.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(404);
    });

    it("should return 500 on save error", async () => {
      mockSaveTrip.mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(500);
    });
  });
});

describe("DELETE /api/trips/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      user: { id: mockUserId },
      context: { requestId: "req-123", ip: "127.0.0.1" },
    });
    mockDeleteTrip.mockResolvedValue({
      success: true,
    });
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      mockRequireAuth.mockResolvedValueOnce(
        NextResponse.json(
          { error: "Authentication required", code: "UNAUTHORIZED" },
          { status: 401 }
        )
      );

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await DELETE(request, context);

      expect(response.status).toBe(401);
    });
  });

  describe("Trip deletion", () => {
    it("should return success when trip is deleted", async () => {
      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await DELETE(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return 400 for invalid trip ID", async () => {
      const request = createMockRequest("https://example.com/api/trips/invalid-id", {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: "invalid-id" }) };
      const response = await DELETE(request, context);

      expect(response.status).toBe(400);
    });

    it("should return 500 on service error", async () => {
      mockDeleteTrip.mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      const request = createMockRequest(`https://example.com/api/trips/${mockTripId}`, {
        method: "DELETE",
      });
      const context = { params: Promise.resolve({ id: mockTripId }) };
      const response = await DELETE(request, context);

      expect(response.status).toBe(500);
    });
  });
});
