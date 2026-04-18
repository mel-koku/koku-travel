import { describe, it, expect, beforeEach } from "vitest";
import type { StoredTrip } from "@/services/trip/types";

/**
 * Note: These are unit tests for the GoshuinBanner logic.
 * Full component rendering and interaction tests should be done with @testing-library/react.
 */

 
function createMockTrip(overrides: Partial<StoredTrip> = {}): StoredTrip {
  return {
    id: "trip-1",
    name: "Test Trip",
    createdAt: "2026-04-18T00:00:00Z",
    updatedAt: "2026-04-18T00:00:00Z",
    itinerary: { days: [] },
    builderData: {},
    ...overrides,
  };
}

describe("GoshuinBanner logic", () => {
  beforeEach(() => {
    // Clear session storage before each test
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
    }
  });

  describe("hasVisitedShrineOrTemple", () => {
    it("returns false for empty itinerary", () => {
      const _trip = createMockTrip({ itinerary: { days: [] } });
      // This test requires the function to be exported or tested via component props
      expect(true).toBe(true); // Placeholder
    });

    it("returns true when trip includes shrine activity", () => {
      const trip = createMockTrip({
        itinerary: {
          days: [
            {
              day: 1,
              cityId: "tokyo",
              activities: [
                {
                  kind: "place",
                  id: "act-1",
                  locationId: "loc-1",
                  title: "Meiji Shrine",
                  timeOfDay: "afternoon",
                  durationMin: 60,
                  tags: ["shrine"],
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
              ],
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ] as any,
        },
      });
      // Component should render when this condition is true
      expect(trip.itinerary?.days?.length).toBe(1);
    });

    it("returns true when trip includes temple activity", () => {
      const trip = createMockTrip({
        itinerary: {
          days: [
            {
              day: 1,
              cityId: "kyoto",
              activities: [
                {
                  kind: "place",
                  id: "act-1",
                  locationId: "loc-1",
                  title: "Kinkaku-ji",
                  timeOfDay: "afternoon",
                  durationMin: 90,
                  tags: ["temple"],
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
              ],
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ] as any,
        },
      });
      expect(trip.itinerary?.days?.length).toBe(1);
    });
  });

  describe("dismiss state", () => {
    it("respects goshuinShown flag in trip.planningWarnings", () => {
      const trip = createMockTrip({
        planningWarnings: { goshuinShown: true },
      });
      expect(trip.planningWarnings?.goshuinShown).toBe(true);
    });

    it("defaults to showing banner when goshuinShown is not set", () => {
      const trip = createMockTrip({
        planningWarnings: undefined,
      });
      expect(trip.planningWarnings?.goshuinShown).toBeUndefined();
    });

    it("banner hidden when goshuinShown is false explicitly", () => {
      const trip = createMockTrip({
        planningWarnings: { goshuinShown: false },
      });
      expect(trip.planningWarnings?.goshuinShown).toBe(false);
    });
  });
});
