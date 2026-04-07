import { describe, it, expect } from "vitest";
import { VIBES } from "../vibes";
import { VIBE_ICON_MAP } from "../vibeIcons";

// Filter same as trip builder: exclude "in_season" (Places-only)
const TRIP_BUILDER_VIBES = VIBES.filter((v) => v.id !== "in_season");

describe("VIBE_ICON_MAP", () => {
  it("should have an icon for every trip builder vibe", () => {
    for (const vibe of TRIP_BUILDER_VIBES) {
      expect(
        VIBE_ICON_MAP[vibe.icon],
        `Missing icon for "${vibe.id}" (icon: "${vibe.icon}")`
      ).toBeDefined();
    }
  });

  it("should have an icon for every vibe including in_season", () => {
    for (const vibe of VIBES) {
      expect(
        VIBE_ICON_MAP[vibe.icon],
        `Missing icon for "${vibe.id}" (icon: "${vibe.icon}")`
      ).toBeDefined();
    }
  });
});
