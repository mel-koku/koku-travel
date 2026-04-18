import { describe, it, expect } from "vitest";
import { haversineKm, computeRelativeTime } from "../usgs";

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
