import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase and withApiHandler to simulate authenticated user and trip.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({} as unknown)),
}));

vi.mock("@/services/sync/tripSync", () => ({
  fetchTripById: vi.fn(),
}));

vi.mock("@/lib/api/withApiHandler", () => ({
  withApiHandler: (
    handler: (req: NextRequest, ctx: { context: { requestId: string }; user: { id: string } }) => Promise<Response>,
  ) => (req: NextRequest) => handler(req, { context: { requestId: "test-req" }, user: { id: "test-user" } }),
}));

import { GET } from "../route";
import { __resetFeedCacheForTests } from "../_feedCache";
import { fetchTripById } from "@/services/sync/tripSync";

const TOKYO_QUAKE = {
  type: "FeatureCollection",
  features: [
    {
      id: "us1000abcd",
      properties: { mag: 5.8, time: Date.now() - 6 * 60 * 60_000, place: "off east coast of Honshu" },
      geometry: { type: "Point", coordinates: [140.1063, 35.6073, 35] },
    },
  ],
};

const ORIGINAL_FETCH = global.fetch;

describe("GET /api/alerts/earthquakes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetFeedCacheForTests();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(TOKYO_QUAKE), { status: 200, headers: { "Content-Type": "application/json" } }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it("returns an alert for an authenticated owner with a Tokyo trip", async () => {
    vi.mocked(fetchTripById).mockResolvedValue({
      success: true,
      data: {
        id: "trip-123",
        userId: "test-user",
        builderData: {
          dates: { start: "2026-04-18", end: "2026-04-28" },
          cities: ["tokyo"],
        },
      } as unknown as Awaited<ReturnType<typeof fetchTripById>>["data"],
    });

    const req = new NextRequest("http://localhost/api/alerts/earthquakes?tripId=11111111-1111-1111-1111-111111111111");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: { magnitude: number; nearestCity: string } | null };
    expect(body.alert).not.toBeNull();
    expect(body.alert?.magnitude).toBe(5.8);
    expect(body.alert?.nearestCity).toBe("Tokyo");
  });
});

describe("GET /api/alerts/earthquakes — failure modes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetFeedCacheForTests();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it("returns 400 for invalid tripId", async () => {
    const req = new NextRequest("http://localhost/api/alerts/earthquakes?tripId=not-a-uuid");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for trip not found / ownership mismatch", async () => {
    vi.mocked(fetchTripById).mockResolvedValue({ success: true, data: null });
    const req = new NextRequest("http://localhost/api/alerts/earthquakes?tripId=11111111-1111-1111-1111-111111111111");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 { alert: null } on USGS timeout", async () => {
    vi.mocked(fetchTripById).mockResolvedValue({
      success: true,
      data: {
        id: "trip-123",
        userId: "test-user",
        builderData: { dates: { start: "2026-04-18", end: "2026-04-28" }, cities: ["tokyo"] },
      } as unknown as Awaited<ReturnType<typeof fetchTripById>>["data"],
    });
    global.fetch = vi.fn(() => new Promise((_r, reject) => setTimeout(() => reject(new Error("aborted")), 10))) as typeof fetch;
    const req = new NextRequest("http://localhost/api/alerts/earthquakes?tripId=11111111-1111-1111-1111-111111111111");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: unknown };
    expect(body.alert).toBeNull();
  });

  it("returns 200 { alert: null } on USGS 500", async () => {
    vi.mocked(fetchTripById).mockResolvedValue({
      success: true,
      data: {
        id: "trip-123",
        userId: "test-user",
        builderData: { dates: { start: "2026-04-18", end: "2026-04-28" }, cities: ["tokyo"] },
      } as unknown as Awaited<ReturnType<typeof fetchTripById>>["data"],
    });
    global.fetch = vi.fn(async () => new Response("boom", { status: 500 })) as typeof fetch;
    const req = new NextRequest("http://localhost/api/alerts/earthquakes?tripId=11111111-1111-1111-1111-111111111111");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: unknown };
    expect(body.alert).toBeNull();
  });

  it("returns 200 { alert: null } on malformed JSON", async () => {
    vi.mocked(fetchTripById).mockResolvedValue({
      success: true,
      data: {
        id: "trip-123",
        userId: "test-user",
        builderData: { dates: { start: "2026-04-18", end: "2026-04-28" }, cities: ["tokyo"] },
      } as unknown as Awaited<ReturnType<typeof fetchTripById>>["data"],
    });
    global.fetch = vi.fn(async () => new Response("not json", { status: 200 })) as typeof fetch;
    const req = new NextRequest("http://localhost/api/alerts/earthquakes?tripId=11111111-1111-1111-1111-111111111111");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alert: unknown };
    expect(body.alert).toBeNull();
  });
});
