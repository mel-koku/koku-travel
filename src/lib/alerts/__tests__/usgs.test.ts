import { describe, it, expect } from "vitest";
import { haversineKm, computeRelativeTime, filterRelevantQuake, type USGSQuake, type TripContext } from "../usgs";

describe("haversineKm", () => {
  it("Tokyo to Chiba is about 35 km", () => {
    const tokyo = { lat: 35.6762, lon: 139.6503 };
    const chiba = { lat: 35.6073, lon: 140.1063 };
    const d = haversineKm(tokyo, chiba);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(45);
  });

  it("Tokyo to Osaka is about 400 km", () => {
    const tokyo = { lat: 35.6762, lon: 139.6503 };
    const osaka = { lat: 34.6937, lon: 135.5023 };
    const d = haversineKm(tokyo, osaka);
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(420);
  });

  it("same point returns 0", () => {
    const p = { lat: 35.6762, lon: 139.6503 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 6);
  });
});

describe("computeRelativeTime", () => {
  const now = new Date("2026-04-19T12:00:00Z").getTime();

  it("less than 90 minutes ago → 'less than an hour ago'", () => {
    expect(computeRelativeTime(now - 30 * 60_000, now)).toBe("less than an hour ago");
    expect(computeRelativeTime(now - 89 * 60_000, now)).toBe("less than an hour ago");
  });

  it("90 minutes to 47 hours ago → 'about N hours ago'", () => {
    expect(computeRelativeTime(now - 90 * 60_000, now)).toBe("about 1 hours ago");
    expect(computeRelativeTime(now - 6 * 60 * 60_000, now)).toBe("about 6 hours ago");
    expect(computeRelativeTime(now - 47 * 60 * 60_000, now)).toBe("about 47 hours ago");
  });

  it("at or over 48 hours → still formats (filter rejects before here)", () => {
    const s = computeRelativeTime(now - 48 * 60 * 60_000, now);
    expect(s).toMatch(/about 48 hours ago/);
  });
});

function makeQuake(overrides: Partial<USGSQuake["properties"]> & { lat?: number; lon?: number; id?: string } = {}): USGSQuake {
  return {
    id: overrides.id ?? "usgs-1",
    properties: {
      mag: overrides.mag ?? 5.0,
      time: overrides.time ?? Date.now(),
      place: overrides.place ?? "test",
    },
    geometry: {
      type: "Point",
      coordinates: [overrides.lon ?? 139.6503, overrides.lat ?? 35.6762, 10],
    },
  };
}

const tokyo = { id: "tokyo" as const, name: "Tokyo", lat: 35.6762, lon: 139.6503 };

function makeTrip(startIso: string, endIso: string): TripContext {
  return {
    cities: [tokyo],
    startDate: new Date(startIso),
    endDate: new Date(endIso),
  };
}

describe("filterRelevantQuake — trip-date pre-gate", () => {
  const now = new Date("2026-04-19T12:00:00Z");

  it("returns null for empty feed", () => {
    expect(filterRelevantQuake([], makeTrip("2026-04-20", "2026-04-25"), now)).toBeNull();
  });

  it("returns null when trip ended yesterday", () => {
    const q = makeQuake({ time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], makeTrip("2026-04-10", "2026-04-18"), now)).toBeNull();
  });

  it("returns null when trip starts >14 days out (even for M6+)", () => {
    const q = makeQuake({ mag: 6.5, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], makeTrip("2026-05-10", "2026-05-15"), now)).toBeNull();
  });

  it("admits quakes when trip is active", () => {
    const q = makeQuake({ time: now.getTime() - 60 * 60_000 });
    const alert = filterRelevantQuake([q], makeTrip("2026-04-15", "2026-04-25"), now);
    expect(alert).not.toBeNull();
    expect(alert?.nearestCity).toBe("Tokyo");
  });
});
