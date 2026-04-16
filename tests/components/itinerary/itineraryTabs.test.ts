import { describe, it, expect } from "vitest";
import {
  buildItineraryTabs,
  resolveTabClick,
  type ItineraryTab,
} from "@/components/features/itinerary/itineraryTabs";

describe("buildItineraryTabs", () => {
  it("returns Timeline + Overview for an unlocked trip with no read-only or briefing", () => {
    const tabs = buildItineraryTabs({
      isTripLocked: false,
      isReadOnly: false,
      isUsingMock: false,
      hasCulturalBriefing: false,
    });
    expect(tabs.map((t) => t.key)).toEqual(["timeline", "dashboard", "discover"]);
    expect(tabs.every((t) => t.locked === false)).toBe(true);
    expect(tabs.find((t) => t.key === "dashboard")?.lockContext).toBeUndefined();
    expect(tabs.find((t) => t.key === "discover")?.lockContext).toBeUndefined();
  });

  it("marks Overview and Near Me as locked when trip is locked and not mock", () => {
    const tabs = buildItineraryTabs({
      isTripLocked: true,
      isReadOnly: false,
      isUsingMock: false,
      hasCulturalBriefing: false,
    });
    const overview = tabs.find((t) => t.key === "dashboard");
    const nearMe = tabs.find((t) => t.key === "discover");
    expect(overview?.locked).toBe(true);
    expect(overview?.lockContext).toBe("overview");
    expect(nearMe?.locked).toBe(true);
    expect(nearMe?.lockContext).toBe("near_me");
  });

  it("does not mark tabs as locked when isUsingMock is true, even if isTripLocked is true", () => {
    const tabs = buildItineraryTabs({
      isTripLocked: true,
      isReadOnly: false,
      isUsingMock: true,
      hasCulturalBriefing: false,
    });
    expect(tabs.every((t) => t.locked === false)).toBe(true);
  });

  it("omits Near Me in read-only mode", () => {
    const tabs = buildItineraryTabs({
      isTripLocked: false,
      isReadOnly: true,
      isUsingMock: false,
      hasCulturalBriefing: false,
    });
    expect(tabs.map((t) => t.key)).toEqual(["timeline", "dashboard"]);
  });

  it("includes Before You Land when hasCulturalBriefing is true", () => {
    const tabs = buildItineraryTabs({
      isTripLocked: false,
      isReadOnly: false,
      isUsingMock: false,
      hasCulturalBriefing: true,
    });
    expect(tabs.map((t) => t.key)).toEqual([
      "timeline",
      "dashboard",
      "discover",
      "culture",
    ]);
  });

  it("Timeline and Before You Land are never locked", () => {
    const tabs = buildItineraryTabs({
      isTripLocked: true,
      isReadOnly: false,
      isUsingMock: false,
      hasCulturalBriefing: true,
    });
    const timeline = tabs.find((t) => t.key === "timeline");
    const culture = tabs.find((t) => t.key === "culture");
    expect(timeline?.locked).toBe(false);
    expect(culture?.locked).toBe(false);
  });
});

describe("resolveTabClick", () => {
  const lockedOverview: ItineraryTab = {
    key: "dashboard",
    label: "Overview",
    locked: true,
    lockContext: "overview",
  };
  const unlockedOverview: ItineraryTab = {
    key: "dashboard",
    label: "Overview",
    locked: false,
  };

  it("returns an unlock action when the tab is locked", () => {
    const decision = resolveTabClick(lockedOverview);
    expect(decision).toEqual({ action: "unlock", context: "overview" });
  });

  it("returns a switch action when the tab is unlocked", () => {
    const decision = resolveTabClick(unlockedOverview);
    expect(decision).toEqual({ action: "switch", key: "dashboard" });
  });

  it("returns a switch action when locked is true but lockContext is missing (defensive)", () => {
    const malformed: ItineraryTab = {
      key: "dashboard",
      label: "Overview",
      locked: true,
    };
    const decision = resolveTabClick(malformed);
    expect(decision).toEqual({ action: "switch", key: "dashboard" });
  });
});
