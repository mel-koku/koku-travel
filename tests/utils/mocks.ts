import { vi } from "vitest";
import { NextRequest } from "next/server";
import type { Mock } from "vitest";

/**
 * Common mocks for testing API routes and components
 */

/**
 * Type for mock Supabase client
 */
export type MockSupabaseClient = {
  auth: {
    exchangeCodeForSession: Mock;
    getSession: Mock;
    getUser: Mock;
    onAuthStateChange: Mock;
  };
  from: Mock;
};

/**
 * Creates a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    ip?: string;
  },
): NextRequest {
  const { method = "GET", headers = {}, body, ip } = options || {};
  const requestHeaders = new Headers(headers);
  if (ip) {
    requestHeaders.set("x-forwarded-for", ip);
  }

  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body || undefined,
  });
}

/**
 * Mock Supabase client
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn((callback) => {
        // Call callback immediately with no session
        callback("SIGNED_OUT", null);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
          error: null,
        };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };
}


/**
 * Mock Google Places API response
 */
export function createMockPhotoStreamResponse(): Response {
  return new Response(new Blob(["mock-image-data"], { type: "image/jpeg" }), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * Mock location details response
 */
export function createMockLocationDetails() {
  return {
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    formattedAddress: "123 Test St, Tokyo, Japan",
    rating: 4.5,
    userRatingCount: 100,
    photos: [
      {
        name: "places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/test-photo-ref",
        widthPx: 1600,
        heightPx: 1200,
        proxyUrl: "/api/places/photo?photoName=places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/test-photo-ref",
        attributions: [],
      },
    ],
    reviews: [],
    fetchedAt: new Date().toISOString(),
  };
}

