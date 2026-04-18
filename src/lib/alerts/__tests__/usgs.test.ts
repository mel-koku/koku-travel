import { describe, it, expect } from "vitest";
import { haversineKm } from "../usgs";

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
