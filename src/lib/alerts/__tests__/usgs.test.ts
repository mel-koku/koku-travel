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

describe("filterRelevantQuake — per-quake gates", () => {
  const now = new Date("2026-04-19T12:00:00Z");
  const activeTrip = makeTrip("2026-04-15", "2026-04-25");

  it("M4.9 is rejected (magnitude)", () => {
    const q = makeQuake({ mag: 4.9, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], activeTrip, now)).toBeNull();
  });

  it("M5.0 at 10 km today is accepted", () => {
    const q = makeQuake({ mag: 5.0, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], activeTrip, now)).not.toBeNull();
  });

  it("quake at 151 km is rejected (distance)", () => {
    const q = makeQuake({ mag: 5.0, time: now.getTime() - 60 * 60_000, lat: 35.6762, lon: 141.6503 });
    expect(filterRelevantQuake([q], activeTrip, now)).toBeNull();
  });

  it("quake 49h old is rejected (age)", () => {
    const q = makeQuake({ mag: 5.0, time: now.getTime() - 49 * 60 * 60_000 });
    expect(filterRelevantQuake([q], activeTrip, now)).toBeNull();
  });

  it("M5.5 with trip starting 8 days out → null (7-day window for <M6)", () => {
    const trip = makeTrip("2026-04-27", "2026-05-01");
    const q = makeQuake({ mag: 5.5, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], trip, now)).toBeNull();
  });

  it("M5.5 with trip starting 7 days out → alert", () => {
    const trip = makeTrip("2026-04-26", "2026-05-01");
    const q = makeQuake({ mag: 5.5, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], trip, now)).not.toBeNull();
  });

  it("M6.0 with trip starting 14 days out → alert (14-day window for >=M6)", () => {
    const trip = makeTrip("2026-05-03", "2026-05-10");
    const q = makeQuake({ mag: 6.0, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], trip, now)).not.toBeNull();
  });

  it("M6.0 with trip starting 15 days out → null (outside 14-day window)", () => {
    const trip = makeTrip("2026-05-04", "2026-05-10");
    const q = makeQuake({ mag: 6.0, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], trip, now)).toBeNull();
  });

  it("two passing quakes — most recent wins", () => {
    const older = makeQuake({ id: "older", mag: 5.0, time: now.getTime() - 3 * 60 * 60_000 });
    const newer = makeQuake({ id: "newer", mag: 5.0, time: now.getTime() - 1 * 60 * 60_000 });
    const alert = filterRelevantQuake([older, newer], activeTrip, now);
    expect(alert?.id).toBe("newer");
  });

  it("two passing quakes at same time — larger mag wins", () => {
    const t = now.getTime() - 60 * 60_000;
    const smaller = makeQuake({ id: "smaller", mag: 5.0, time: t });
    const bigger = makeQuake({ id: "bigger", mag: 5.8, time: t });
    const alert = filterRelevantQuake([smaller, bigger], activeTrip, now);
    expect(alert?.id).toBe("bigger");
  });

  it("three-city trip — quake near only one → nearestCity is that one", () => {
    const nara = { id: "nara" as const, name: "Nara", lat: 34.6851, lon: 135.8048 };
    const osaka = { id: "osaka" as const, name: "Osaka", lat: 34.6937, lon: 135.5023 };
    const trip: TripContext = {
      cities: [tokyo, nara, osaka],
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-25"),
    };
    const q = makeQuake({ mag: 5.2, time: now.getTime() - 60 * 60_000, lat: 34.6851, lon: 135.8048 });
    const alert = filterRelevantQuake([q], trip, now);
    expect(alert?.nearestCity).toBe("Nara");
  });

  it("malformed quake (missing mag) is skipped; valid quake still surfaces", () => {
    const malformed = { id: "bad", properties: { time: now.getTime() }, geometry: { type: "Point", coordinates: [139.65, 35.67, 10] } };
    const good = makeQuake({ mag: 5.1, time: now.getTime() - 60 * 60_000 });
    const alert = filterRelevantQuake([malformed, good], activeTrip, now);
    expect(alert?.id).toBe("usgs-1");
  });

  it("trip with zero cities → null", () => {
    const trip: TripContext = { cities: [], startDate: new Date("2026-04-15"), endDate: new Date("2026-04-25") };
    const q = makeQuake({ mag: 5.0, time: now.getTime() - 60 * 60_000 });
    expect(filterRelevantQuake([q], trip, now)).toBeNull();
  });
});
