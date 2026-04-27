import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { RoutingRequest, RoutingResult } from "../types";

const mockFetchNavitimeRoute = vi.fn();
const mockFetchGoogleRoute = vi.fn();
const mockFetchMapboxRoute = vi.fn();

vi.mock("../navitime", () => ({
  fetchNavitimeRoute: (req: RoutingRequest) => mockFetchNavitimeRoute(req),
}));
vi.mock("../google", () => ({
  fetchGoogleRoute: (req: RoutingRequest) => mockFetchGoogleRoute(req),
}));
vi.mock("../mapbox", () => ({
  fetchMapboxRoute: (req: RoutingRequest) => mockFetchMapboxRoute(req),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    isCheapMode: false,
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Reset env between tests so isEnabled() reads consistent values
  process.env = { ...ORIGINAL_ENV };
  process.env.NAVITIME_RAPIDAPI_KEY = "test-navitime-key";
  process.env.ROUTING_GOOGLE_MAPS_API_KEY = "test-google-key";
  delete process.env.ROUTING_MAPBOX_ACCESS_TOKEN;
  delete process.env.ROUTING_PROVIDER;
  mockFetchNavitimeRoute.mockReset();
  mockFetchGoogleRoute.mockReset();
  mockFetchMapboxRoute.mockReset();
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const NRT = { lat: 35.7647, lng: 140.3863 };
const TOKYO_HOTEL = { lat: 35.6895, lng: 139.6917 }; // ~70km from NRT
const NEAR_HOTEL = { lat: 35.7660, lng: 140.3900 }; // ~400m from NRT

const buildResult = (
  mode: "transit" | "walking" | "driving",
  durationSeconds: number,
  opts: { hasTransitStep?: boolean } = {},
): RoutingResult => ({
  provider: "mock",
  mode,
  durationSeconds,
  distanceMeters: 70000,
  legs: [
    {
      mode,
      durationSeconds,
      distanceMeters: 70000,
      summary: `${mode} leg`,
      steps: [
        {
          instruction: opts.hasTransitStep ? "Take the Skyliner" : "Walk to destination",
          stepMode: opts.hasTransitStep ? "transit" : "walk",
          durationSeconds,
        },
      ],
    },
  ],
  warnings: [],
  fetchedAt: new Date().toISOString(),
});

describe("requestRoute — NAVITIME → Google transit failover", () => {
  it("retries with Google when NAVITIME returns a transit response with no transit steps", async () => {
    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 50400, { hasTransitStep: false }),
    );
    mockFetchGoogleRoute.mockResolvedValue(
      buildResult("transit", 2400, { hasTransitStep: true }),
    );

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const result = await requestRoute({
      origin: NRT,
      destination: TOKYO_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    });

    expect(mockFetchNavitimeRoute).toHaveBeenCalledTimes(1);
    expect(mockFetchGoogleRoute).toHaveBeenCalledTimes(1);
    // Returned route is Google's, with real transit steps and 40-min duration.
    expect(result.durationSeconds).toBe(2400);
    expect(
      result.legs.some((leg) => leg.steps?.some((s) => s.stepMode === "transit")),
    ).toBe(true);
  });

  it("does NOT retry when NAVITIME returns a transit response with real transit steps", async () => {
    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 2400, { hasTransitStep: true }),
    );
    mockFetchGoogleRoute.mockResolvedValue(
      buildResult("transit", 999, { hasTransitStep: true }),
    );

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const result = await requestRoute({
      origin: NRT,
      destination: TOKYO_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    });

    expect(mockFetchNavitimeRoute).toHaveBeenCalledTimes(1);
    expect(mockFetchGoogleRoute).not.toHaveBeenCalled();
    expect(result.durationSeconds).toBe(2400);
  });

  it("does NOT retry when distance is below the 1km failover threshold", async () => {
    // Short walk-only response from NAVITIME for a sub-1km pair is legitimate.
    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 480, { hasTransitStep: false }),
    );
    mockFetchGoogleRoute.mockResolvedValue(
      buildResult("transit", 999, { hasTransitStep: true }),
    );

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const result = await requestRoute({
      origin: NRT,
      destination: NEAR_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    });

    expect(mockFetchNavitimeRoute).toHaveBeenCalledTimes(1);
    expect(mockFetchGoogleRoute).not.toHaveBeenCalled();
    expect(result.durationSeconds).toBe(480);
  });

  it("keeps NAVITIME's response when Google is not configured", async () => {
    delete process.env.ROUTING_GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_DIRECTIONS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 50400, { hasTransitStep: false }),
    );

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const result = await requestRoute({
      origin: NRT,
      destination: TOKYO_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    });

    expect(mockFetchNavitimeRoute).toHaveBeenCalledTimes(1);
    expect(mockFetchGoogleRoute).not.toHaveBeenCalled();
    // Falls through to NAVITIME's walk-only response unchanged.
    expect(result.durationSeconds).toBe(50400);
  });

  it("keeps NAVITIME's response when Google retry also returns no transit steps", async () => {
    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 50400, { hasTransitStep: false }),
    );
    mockFetchGoogleRoute.mockResolvedValue(
      buildResult("transit", 50400, { hasTransitStep: false }),
    );

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const result = await requestRoute({
      origin: NRT,
      destination: TOKYO_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    });

    expect(mockFetchGoogleRoute).toHaveBeenCalledTimes(1);
    // Both providers soft-failed — keep NAVITIME's response (caller can
    // decide what to do with it).
    expect(result.durationSeconds).toBe(50400);
  });

  it("keeps NAVITIME's response when Google retry throws", async () => {
    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 50400, { hasTransitStep: false }),
    );
    mockFetchGoogleRoute.mockRejectedValue(new Error("Google quota exceeded"));

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const result = await requestRoute({
      origin: NRT,
      destination: TOKYO_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    });

    expect(mockFetchGoogleRoute).toHaveBeenCalledTimes(1);
    expect(result.durationSeconds).toBe(50400);
  });

  it("caches the Google result after a successful retry", async () => {
    mockFetchNavitimeRoute.mockResolvedValue(
      buildResult("transit", 50400, { hasTransitStep: false }),
    );
    mockFetchGoogleRoute.mockResolvedValue(
      buildResult("transit", 2400, { hasTransitStep: true }),
    );

    const { requestRoute, clearRoutingCache } = await import("../provider");
    clearRoutingCache();
    const req: RoutingRequest = {
      origin: NRT,
      destination: TOKYO_HOTEL,
      mode: "transit",
      departureTime: "09:00",
    };
    const first = await requestRoute(req);
    const second = await requestRoute(req);

    // Both calls return the Google result; the second hits cache (no extra
    // upstream calls).
    expect(first.durationSeconds).toBe(2400);
    expect(second.durationSeconds).toBe(2400);
    expect(mockFetchNavitimeRoute).toHaveBeenCalledTimes(1);
    expect(mockFetchGoogleRoute).toHaveBeenCalledTimes(1);
  });
});

describe("isTransitSoftFail", () => {
  it("returns true for transit-mode result with no transit steps", async () => {
    const { isTransitSoftFail } = await import("../provider");
    expect(
      isTransitSoftFail(buildResult("transit", 1800, { hasTransitStep: false })),
    ).toBe(true);
  });

  it("returns false for transit-mode result with transit steps", async () => {
    const { isTransitSoftFail } = await import("../provider");
    expect(
      isTransitSoftFail(buildResult("transit", 1800, { hasTransitStep: true })),
    ).toBe(false);
  });

  it("returns false for non-transit-mode results", async () => {
    const { isTransitSoftFail } = await import("../provider");
    expect(
      isTransitSoftFail(buildResult("walking", 1800, { hasTransitStep: false })),
    ).toBe(false);
    expect(
      isTransitSoftFail(buildResult("driving", 1800, { hasTransitStep: false })),
    ).toBe(false);
  });
});
