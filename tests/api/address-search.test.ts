import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest } from "../utils/mocks";

const { mockGetUser, mockSupabase, mockRequireAuth } = vi.hoisted(() => {
  const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
  const mockSupabase = { auth: { getUser: mockGetUser } };
  const mockRequireAuth = vi.fn();
  return { mockGetUser, mockSupabase, mockRequireAuth };
});

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/middleware")>();
  return {
    ...actual,
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  };
});

vi.mock("@/lib/addressSearch/mapbox", () => ({
  mapboxSuggest: vi.fn(),
  mapboxRetrieve: vi.fn(),
}));
vi.mock("@/lib/addressSearch/google", () => ({
  googleSearch: vi.fn(),
  googleRetrieve: vi.fn(),
}));
vi.mock("@/lib/addressSearch/rateLimit", () => ({
  checkAndIncrement: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { POST } from "@/app/api/address-search/route";
import { mapboxSuggest } from "@/lib/addressSearch/mapbox";
import { checkAndIncrement } from "@/lib/addressSearch/rateLimit";

function makeRequest(body: unknown) {
  return createMockRequest("http://test/api/address-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockRequireAuth.mockResolvedValue({
    user: { id: "user-1" },
    context: { requestId: "req-test", ip: "127.0.0.1" },
  });
  process.env.ROUTING_MAPBOX_ACCESS_TOKEN = "mbox-key";
  process.env.GOOGLE_PLACES_API_KEY = "gkey";
});

describe("POST /api/address-search", () => {
  it("proxies Mapbox suggest and checks rate limit", async () => {
    (checkAndIncrement as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 99,
    });
    (mapboxSuggest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "m-1", title: "Ramen", subtitle: "Tokyo" },
    ]);

    const res = await POST(
      makeRequest({
        action: "suggest",
        provider: "mapbox",
        query: "ram",
        sessionToken: "sess-1",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    expect(mapboxSuggest).toHaveBeenCalledWith("ram", "sess-1", "mbox-key");
  });

  it("returns 429 when over rate limit", async () => {
    (checkAndIncrement as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
    });
    const res = await POST(
      makeRequest({
        action: "suggest",
        provider: "mapbox",
        query: "r",
        sessionToken: "sess-1",
      }),
    );
    expect(res.status).toBe(429);
  });
});
