import { describe, it, expect } from "vitest";
import { shouldShowAccessibilityBanner } from "../accessibilityOverlay";
import type { StoredTrip } from "@/services/trip/types";

function makeTrip(accessibility: unknown): StoredTrip {
  return {
    id: "t1",
    builderData: {
      duration: 3,
      dates: {},
      regions: ["kansai"],
      cities: ["kyoto"],
      vibes: ["temples_tradition"],
      style: "balanced",
      accessibility,
    },
  } as unknown as StoredTrip;
}

describe("shouldShowAccessibilityBanner", () => {
  it("returns true when mobility flag is true", () => {
    const trip = makeTrip({ mobility: true });
    expect(shouldShowAccessibilityBanner(trip)).toBe(true);
  });

  it("returns false when mobility flag is false", () => {
    const trip = makeTrip({ mobility: false });
    expect(shouldShowAccessibilityBanner(trip)).toBe(false);
  });

  it("returns false when mobility flag is unset", () => {
    const trip = makeTrip({});
    expect(shouldShowAccessibilityBanner(trip)).toBe(false);
  });

  it("returns false when accessibility object is missing", () => {
    const trip = makeTrip(undefined);
    expect(shouldShowAccessibilityBanner(trip)).toBe(false);
  });

  it("does not confuse other accessibility fields", () => {
    const trip = makeTrip({ dietary: ["vegan"], mobility: undefined });
    expect(shouldShowAccessibilityBanner(trip)).toBe(false);
  });

  it("ignores non-boolean truthy values (strict check)", () => {
    // Defensive against bad client data; only exact `true` triggers the banner.
    const trip = makeTrip({ mobility: "yes" as unknown as boolean });
    expect(shouldShowAccessibilityBanner(trip)).toBe(false);
  });
});
