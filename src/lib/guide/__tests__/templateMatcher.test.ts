import { describe, it, expect, beforeEach } from "vitest";
import {
  initCulturalMomentIndex,
  matchCulturalMoment,
} from "../templateMatcher";
import type { CulturalMomentTemplate } from "@/types/itineraryGuide";

const CITY_TEMPLATE: CulturalMomentTemplate = {
  id: "test-city",
  key: "onsen:fukuoka",
  content: "fukuoka-specific onsen tip",
  icon: "♨️",
};

const REGION_TEMPLATE: CulturalMomentTemplate = {
  id: "test-region",
  key: "onsen:kyushu",
  content: "kyushu-region onsen tip",
  icon: "♨️",
};

const SUBCAT_ANY_TEMPLATE: CulturalMomentTemplate = {
  id: "test-subcat-any",
  key: "onsen:any",
  content: "generic onsen tip",
  icon: "♨️",
};

const ANY_REGION_TEMPLATE: CulturalMomentTemplate = {
  id: "test-any-region",
  key: "any:hokkaido",
  content: "hokkaido universal tip",
};

const ANY_ANY_TEMPLATE: CulturalMomentTemplate = {
  id: "test-any-any",
  key: "any:any",
  content: "universal fallback",
};

describe("matchCulturalMoment — region fallback", () => {
  beforeEach(() => {
    initCulturalMomentIndex([]);
  });

  it("prefers city match over region match", () => {
    initCulturalMomentIndex([CITY_TEMPLATE, REGION_TEMPLATE, SUBCAT_ANY_TEMPLATE]);
    const result = matchCulturalMoment("onsen", "fukuoka", "seed-1");
    expect(result?.id).toBe("test-city");
  });

  it("falls back to region when city-specific template missing", () => {
    initCulturalMomentIndex([REGION_TEMPLATE, SUBCAT_ANY_TEMPLATE]);
    const result = matchCulturalMoment("onsen", "kagoshima", "seed-2");
    expect(result?.id).toBe("test-region");
  });

  it("falls back to region for any Kyushu city without its own template", () => {
    initCulturalMomentIndex([REGION_TEMPLATE]);
    const kyushuCities = ["fukuoka", "nagasaki", "kumamoto", "kagoshima", "oita"];
    for (const city of kyushuCities) {
      const result = matchCulturalMoment("onsen", city, `seed-${city}`);
      expect(result?.id, `city=${city}`).toBe("test-region");
    }
  });

  it("falls back to subcat:any when neither city nor region match", () => {
    initCulturalMomentIndex([REGION_TEMPLATE, SUBCAT_ANY_TEMPLATE]);
    // tokyo is kanto, not kyushu
    const result = matchCulturalMoment("onsen", "tokyo", "seed-3");
    expect(result?.id).toBe("test-subcat-any");
  });

  it("falls back to any:region before any:any", () => {
    initCulturalMomentIndex([ANY_REGION_TEMPLATE, ANY_ANY_TEMPLATE]);
    const result = matchCulturalMoment("shrine", "sapporo", "seed-4");
    expect(result?.id).toBe("test-any-region");
  });

  it("falls back to any:any for unknown subcat and unknown city", () => {
    initCulturalMomentIndex([ANY_ANY_TEMPLATE]);
    const result = matchCulturalMoment("unknown-sub", "made-up-city", "seed-5");
    expect(result?.id).toBe("test-any-any");
  });

  it("returns null for unknown city with no matching templates", () => {
    initCulturalMomentIndex([REGION_TEMPLATE]);
    const result = matchCulturalMoment("shrine", "made-up-city", "seed-6");
    expect(result).toBeNull();
  });

  it("handles mixed-case city input", () => {
    initCulturalMomentIndex([REGION_TEMPLATE]);
    const result = matchCulturalMoment("onsen", "Fukuoka", "seed-7");
    expect(result?.id).toBe("test-region");
  });
});
