import { describe, it, expect } from "vitest";
import { getFestivalNearMisses } from "../festivalCalendar";

describe("getFestivalNearMisses", () => {
  it("returns empty when cities array is empty (precise matching only)", () => {
    const result = getFestivalNearMisses(7, 8, 7, 12, []);
    expect(result).toEqual([]);
  });

  it("detects forward near-miss within default window (3 days)", () => {
    // Tenjin Matsuri (osaka) July 24-25; trip ends July 22 → forward gap 2.
    const result = getFestivalNearMisses(7, 18, 7, 22, ["osaka"]);
    const tenjin = result.find((m) => m.festival.id === "tenjin-matsuri");
    expect(tenjin).toBeDefined();
    expect(tenjin?.direction).toBe("forward");
    expect(tenjin?.gapDays).toBe(2);
  });

  it("excludes forward near-miss outside window (gap of 4 days)", () => {
    const result = getFestivalNearMisses(7, 13, 7, 19, ["osaka"]);
    const tenjin = result.find((m) => m.festival.id === "tenjin-matsuri");
    expect(tenjin).toBeUndefined();
  });

  it("detects backward near-miss within default window (2 days)", () => {
    // Aoi Matsuri (kyoto) is May 15. Trip starts May 17 → backward gap 2.
    const result = getFestivalNearMisses(5, 17, 5, 22, ["kyoto"]);
    const aoi = result.find((m) => m.festival.id === "aoi-matsuri");
    expect(aoi).toBeDefined();
    expect(aoi?.direction).toBe("backward");
    expect(aoi?.gapDays).toBe(2);
  });

  it("excludes backward near-miss outside window (gap of 3 days)", () => {
    const result = getFestivalNearMisses(5, 18, 5, 22, ["kyoto"]);
    const aoi = result.find((m) => m.festival.id === "aoi-matsuri");
    expect(aoi).toBeUndefined();
  });

  it("excludes festivals with crowdImpact < 4", () => {
    // Yamayaki (nara) Jan 25 has crowdImpact 3.
    const result = getFestivalNearMisses(1, 19, 1, 23, ["nara"]);
    const yamayaki = result.find((m) => m.festival.id === "yamayaki");
    expect(yamayaki).toBeUndefined();
  });

  it("excludes festivals in cities not in the trip (no region fallback)", () => {
    // Chichibu Night Festival (kanto, Dec 2-3). Trip Nov 28-Dec 1 in Tokyo (also kanto).
    const result = getFestivalNearMisses(11, 28, 12, 1, ["tokyo"]);
    const chichibu = result.find((m) => m.festival.id === "chichibu-night");
    expect(chichibu).toBeUndefined();
  });

  it("handles year-wrap: trip ending Dec 30, festival Jan 9 → forward gap 10 (out of window)", () => {
    const result = getFestivalNearMisses(12, 25, 12, 30, ["osaka"]);
    const tokaEbisu = result.find((m) => m.festival.id === "toka-ebisu");
    expect(tokaEbisu).toBeUndefined();
  });

  it("handles year-wrap: trip Jan 12-13, backward gap to Jan 11 Toka Ebisu = 1", () => {
    const result = getFestivalNearMisses(1, 12, 1, 13, ["osaka"]);
    const tokaEbisu = result.find((m) => m.festival.id === "toka-ebisu");
    expect(tokaEbisu).toBeDefined();
    expect(tokaEbisu?.direction).toBe("backward");
    expect(tokaEbisu?.gapDays).toBe(1);
  });

  it("does not return festivals that overlap the trip", () => {
    const result = getFestivalNearMisses(7, 10, 7, 15, ["kyoto"]);
    const gion = result.find((m) => m.festival.id === "gion-matsuri");
    expect(gion).toBeUndefined();
  });

  it("returns the highest-priority near-miss first when only one match exists", () => {
    // Aoi Matsuri (May 15): forward gap 3 from trip ending May 12.
    const result = getFestivalNearMisses(5, 8, 5, 12, ["kyoto"]);
    expect(result[0]?.festival.id).toBe("aoi-matsuri");
  });

  it("sort comparator: crowdImpact desc beats gapDays asc", () => {
    // Trip Aug 18-22 in Tokyo with wide windows.
    // Sumida Fireworks (Jul 27, impact 5): backward gap 22.
    // Koenji Awa (Aug 23-24, impact 4): forward gap 1.
    // Both pass crowdImpact >= 4 and city === "tokyo".
    // Sumida should sort first because crowdImpact wins over gapDays.
    const result = getFestivalNearMisses(8, 18, 8, 22, ["tokyo"], {
      forwardWindow: 30,
      backwardWindow: 30,
    });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]?.festival.id).toBe("sumida-fireworks");
    const koenjiIndex = result.findIndex((r) => r.festival.id === "koenji-awa");
    const sumidaIndex = result.findIndex((r) => r.festival.id === "sumida-fireworks");
    expect(sumidaIndex).toBeLessThan(koenjiIndex);
  });

  it("respects custom windows from options", () => {
    const wide = getFestivalNearMisses(7, 13, 7, 19, ["osaka"], { forwardWindow: 5 });
    expect(wide.find((m) => m.festival.id === "tenjin-matsuri")).toBeDefined();

    const narrow = getFestivalNearMisses(7, 13, 7, 19, ["osaka"], { forwardWindow: 1 });
    expect(narrow.find((m) => m.festival.id === "tenjin-matsuri")).toBeUndefined();
  });
});
