import { describe, it, expect, vi } from "vitest";

// Mock server-only before importing
vi.mock("server-only", () => ({}));

// Mock ai SDK
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}));

// Mock logger to suppress output and allow assertion
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { applyPatches } from "../dayRefinement";
import { logger } from "@/lib/logger";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { RefinementPatch, FlagPatch } from "@/types/llmConstraints";

function makePlaceActivity(
  id: string,
  title: string,
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id,
    title,
    timeOfDay: "morning",
    durationMin: 60,
    coordinates: { lat: 35, lng: 135 },
    tags: ["temple"],
  };
}

function makeItinerary(
  activities: ItineraryActivity[],
  cityId = "kyoto",
): Itinerary {
  return {
    id: "test-itinerary",
    days: [
      {
        id: "day-1",
        cityId: cityId as import("@/types/trip").CityId,
        activities,
      },
    ],
  };
}

function makeLocation(id: string, name: string, city: string): Location {
  return {
    id,
    name,
    city,
    region: "Kansai",
    category: "temple",
    image: "test.jpg",
    coordinates: { lat: 35, lng: 135 },
  } as Location;
}

describe("applyPatches validation", () => {
  describe("swap: city match validation", () => {
    it("skips swap when replacement location is in a different city", () => {
      const activity = makePlaceActivity("a1", "Kinkakuji");
      const itinerary = makeItinerary([activity], "kyoto");

      const wrongCityLocation = makeLocation("loc-tokyo", "Tokyo Tower", "tokyo");
      const allLocations = [wrongCityLocation];

      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "a1",
          replacementLocationId: "loc-tokyo",
          reason: "Better fit",
        },
      ];

      const result = applyPatches(itinerary, patches, allLocations);

      // Activity should remain unchanged
      expect(result.days[0].activities[0]).toMatchObject({
        id: "a1",
        title: "Kinkakuji",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        "Swap replacement location is in a different city, skipping",
        expect.objectContaining({
          locationCity: "tokyo",
          dayCity: "kyoto",
        }),
      );
    });

    it("allows swap when replacement location is in the same city", () => {
      const activity = makePlaceActivity("a1", "Kinkakuji");
      const itinerary = makeItinerary([activity], "kyoto");

      const sameCityLocation = makeLocation("loc-fushimi", "Fushimi Inari", "kyoto");
      const allLocations = [sameCityLocation];

      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "a1",
          replacementLocationId: "loc-fushimi",
          reason: "Better fit",
        },
      ];

      const result = applyPatches(itinerary, patches, allLocations);

      // Activity should be swapped
      expect(result.days[0].activities[0]).toMatchObject({
        title: "Fushimi Inari",
      });
    });

    it("allows swap when replacement location has no city info", () => {
      const activity = makePlaceActivity("a1", "Kinkakuji");
      const itinerary = makeItinerary([activity], "kyoto");

      const noCityLocation = makeLocation("loc-x", "Mystery Place", "");
      const allLocations = [noCityLocation];

      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "a1",
          replacementLocationId: "loc-x",
          reason: "Better fit",
        },
      ];

      const result = applyPatches(itinerary, patches, allLocations);

      // Swap should proceed (no city to validate against)
      expect(result.days[0].activities[0]).toMatchObject({
        title: "Mystery Place",
      });
    });
  });

  describe("flag: severity validation", () => {
    it("skips flag with invalid severity", () => {
      const activity = makePlaceActivity("a1", "Kinkakuji");
      const itinerary = makeItinerary([activity]);

      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 0,
          activityId: "a1",
          severity: "error" as FlagPatch["severity"],
          message: "Some issue",
        },
      ];

      const result = applyPatches(itinerary, patches, []);

      // Notes should not be modified
      expect(result.days[0].activities[0]).toMatchObject({
        id: "a1",
        kind: "place",
      });
      const placeActivity = result.days[0].activities[0] as Extract<
        ItineraryActivity,
        { kind: "place" }
      >;
      expect(placeActivity.notes).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        "Invalid flag severity, skipping",
        expect.objectContaining({ severity: "error" }),
      );
    });

    it("applies flag with valid severity 'info'", () => {
      const activity = makePlaceActivity("a1", "Kinkakuji");
      const itinerary = makeItinerary([activity]);

      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 0,
          activityId: "a1",
          severity: "info",
          message: "Arrive early for fewer crowds",
        },
      ];

      const result = applyPatches(itinerary, patches, []);

      const placeActivity = result.days[0].activities[0] as Extract<
        ItineraryActivity,
        { kind: "place" }
      >;
      expect(placeActivity.notes).toBe("info: Arrive early for fewer crowds");
    });

    it("applies flag with valid severity 'warning'", () => {
      const activity = makePlaceActivity("a1", "Kinkakuji");
      const itinerary = makeItinerary([activity]);

      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 0,
          activityId: "a1",
          severity: "warning",
          message: "Steep stairs ahead",
        },
      ];

      const result = applyPatches(itinerary, patches, []);

      const placeActivity = result.days[0].activities[0] as Extract<
        ItineraryActivity,
        { kind: "place" }
      >;
      expect(placeActivity.notes).toBe("warning: Steep stairs ahead");
    });
  });

  describe("reorder: place-only ID filtering", () => {
    it("filters out non-place IDs from newOrder", () => {
      const activities: ItineraryActivity[] = [
        makePlaceActivity("p1", "Temple"),
        { kind: "note", id: "n1", title: "Guide note" } as ItineraryActivity,
        makePlaceActivity("p2", "Garden"),
        makePlaceActivity("p3", "Market"),
      ];
      const itinerary = makeItinerary(activities);

      // LLM includes the non-place "n1" in the reorder
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["p3", "n1", "p1", "p2"],
          reason: "Better flow",
        },
      ];

      const result = applyPatches(itinerary, patches, []);

      // After filtering "n1", the order should be [p3, p1, p2]
      const placeActivities = result.days[0].activities.filter(
        (a) => a.kind === "place",
      );
      expect(placeActivities[0].id).toBe("p3");
      expect(placeActivities[1].id).toBe("p1");
      expect(placeActivities[2].id).toBe("p2");
    });

    it("rejects reorder when filtered IDs do not cover all place activities", () => {
      const activities: ItineraryActivity[] = [
        makePlaceActivity("p1", "Temple"),
        makePlaceActivity("p2", "Garden"),
        makePlaceActivity("p3", "Market"),
      ];
      const itinerary = makeItinerary(activities);

      // LLM provides a non-place ID instead of a real place ID, so after filtering
      // the count won't match
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["p1", "fake-id", "p2"],
          reason: "Better flow",
        },
      ];

      const result = applyPatches(itinerary, patches, []);

      // Should be unchanged (wrong count after filtering)
      const placeActivities = result.days[0].activities.filter(
        (a) => a.kind === "place",
      );
      expect(placeActivities[0].id).toBe("p1");
      expect(placeActivities[1].id).toBe("p2");
      expect(placeActivities[2].id).toBe("p3");
    });
  });
});
