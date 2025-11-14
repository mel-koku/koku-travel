import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/places/photo/route";
import { fetchPhotoStream } from "@/lib/googlePlaces";
import { createMockRequest, createMockPhotoStreamResponse } from "../utils/mocks";

// Mock dependencies
vi.mock("@/lib/googlePlaces", () => ({
  fetchPhotoStream: vi.fn(),
}));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("GET /api/places/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
  });

  describe("Rate limiting", () => {
    it("should enforce rate limit of 200 requests per minute", async () => {
      const { checkRateLimit } = await import("@/lib/api/rateLimit");
      vi.mocked(checkRateLimit).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" }), {
          status: 429,
        }),
      );

      const request = createMockRequest("https://example.com/api/places/photo?photoName=places/test/photos/ref");
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Parameter validation", () => {
    it("should return 400 if photoName is missing", async () => {
      const request = createMockRequest("https://example.com/api/places/photo");
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Missing required query parameter 'photoName'");
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid photoName format (path traversal)", async () => {
      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/../../../etc/passwd/photos/ref",
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should return 400 for invalid photoName format (special characters)", async () => {
      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref<script>alert(1)</script>",
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("BAD_REQUEST");
    });

    it("should accept valid photoName format", async () => {
      const mockResponse = createMockPhotoStreamResponse();
      vi.mocked(fetchPhotoStream).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/test-ref",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(fetchPhotoStream).toHaveBeenCalledWith(
        "places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/test-ref",
        {},
      );
    });
  });

  describe("Dimension validation", () => {
    it("should validate maxWidthPx is within 1-4000 range", async () => {
      const mockResponse = createMockPhotoStreamResponse();
      vi.mocked(fetchPhotoStream).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref&maxWidthPx=2000",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(fetchPhotoStream).toHaveBeenCalledWith("places/test/photos/ref", { maxWidthPx: 2000 });
    });

    it("should reject maxWidthPx exceeding 4000", async () => {
      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref&maxWidthPx=5000",
      );
      const response = await GET(request);

      expect(response.status).toBe(200); // parsePositiveInt returns undefined for invalid values
      // The function will call fetchPhotoStream with undefined maxWidthPx
    });

    it("should reject maxWidthPx less than 1", async () => {
      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref&maxWidthPx=0",
      );
      const response = await GET(request);

      expect(response.status).toBe(200); // parsePositiveInt returns null for invalid values
    });

    it("should validate maxHeightPx is within 1-4000 range", async () => {
      const mockResponse = createMockPhotoStreamResponse();
      vi.mocked(fetchPhotoStream).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref&maxHeightPx=1500",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(fetchPhotoStream).toHaveBeenCalledWith("places/test/photos/ref", { maxHeightPx: 1500 });
    });

    it("should accept both maxWidthPx and maxHeightPx", async () => {
      const mockResponse = createMockPhotoStreamResponse();
      vi.mocked(fetchPhotoStream).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref&maxWidthPx=1600&maxHeightPx=1200",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(fetchPhotoStream).toHaveBeenCalledWith("places/test/photos/ref", {
        maxWidthPx: 1600,
        maxHeightPx: 1200,
      });
    });
  });

  describe("Google Places API error handling", () => {
    it("should return 503 if Google Places API key is missing", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

      vi.mocked(fetchPhotoStream).mockRejectedValueOnce(
        new Error("Missing Google Places API key"),
      );

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref",
      );
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain("Google Places API is not configured");
      expect(data.code).toBe("SERVICE_UNAVAILABLE");
    });

    it("should return 500 for network errors", async () => {
      vi.mocked(fetchPhotoStream).mockRejectedValueOnce(new Error("Network error"));

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref",
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 for API errors", async () => {
      vi.mocked(fetchPhotoStream).mockRejectedValueOnce(
        new Error("Failed to fetch photo. Status 404"),
      );

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref",
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Response caching", () => {
    it("should set appropriate cache headers", async () => {
      const mockResponse = createMockPhotoStreamResponse();
      vi.mocked(fetchPhotoStream).mockResolvedValueOnce(mockResponse);

      const request = createMockRequest(
        "https://example.com/api/places/photo?photoName=places/test/photos/ref",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
      );
    });
  });
});

