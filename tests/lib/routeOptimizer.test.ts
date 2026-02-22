import { describe, it, expect, vi } from "vitest";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
import type { ItineraryActivity } from "@/types/itinerary";
import type { EntryPoint } from "@/types/trip";

// Mock getActivityCoordinates to return controlled coordinates
vi.mock("@/lib/itineraryCoordinates", () => ({
  getActivityCoordinates: vi.fn((activity: ItineraryActivity) => {
    if (activity.kind !== "place") return null;
    return activity.coordinates ?? null;
  }),
}));

function makePlaceActivity(
  id: string,
  coords?: { lat: number; lng: number },
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id,
    title: `Place ${id}`,
    timeOfDay: "morning",
    coordinates: coords,
  };
}

function makeNoteActivity(id: string): Extract<ItineraryActivity, { kind: "note" }> {
  return {
    kind: "note",
    id,
    title: "Note",
    timeOfDay: "morning",
    notes: "A note",
  };
}

const startPoint: EntryPoint = {
  type: "airport",
  id: "nrt",
  name: "Narita",
  coordinates: { lat: 35.7648, lng: 140.3864 },
};

describe("routeOptimizer", () => {
  describe("optimizeRouteOrder", () => {
    it("returns original order when no start point", () => {
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a", { lat: 35.0, lng: 135.0 }),
        makePlaceActivity("b", { lat: 36.0, lng: 136.0 }),
      ];
      const result = optimizeRouteOrder(activities);
      expect(result.order).toEqual(["a", "b"]);
      expect(result.orderChanged).toBe(false);
      expect(result.optimizedCount).toBe(0);
    });

    it("returns original order when no place activities", () => {
      const activities: ItineraryActivity[] = [
        makeNoteActivity("n1"),
        makeNoteActivity("n2"),
      ];
      const result = optimizeRouteOrder(activities, startPoint);
      expect(result.order).toEqual(["n1", "n2"]);
      expect(result.orderChanged).toBe(false);
      expect(result.optimizedCount).toBe(0);
    });

    it("returns original order when all place activities lack coordinates", () => {
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a"),
        makePlaceActivity("b"),
      ];
      const result = optimizeRouteOrder(activities, startPoint);
      expect(result.order).toEqual(["a", "b"]);
      expect(result.orderChanged).toBe(false);
      expect(result.skippedCount).toBe(2);
    });

    it("optimizes by nearest-neighbor from start point", () => {
      // Start point is near Tokyo (35.76, 140.38)
      // Activity C is closest to start, then A, then B
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a", { lat: 35.0, lng: 135.0 }), // Kansai area
        makePlaceActivity("b", { lat: 34.0, lng: 133.0 }), // Chugoku area
        makePlaceActivity("c", { lat: 35.6, lng: 139.7 }), // Tokyo area
      ];
      const result = optimizeRouteOrder(activities, startPoint);
      // c is nearest to start (Tokyo), then a (Kansai), then b (Chugoku)
      expect(result.order[0]).toBe("c");
      expect(result.optimizedCount).toBe(3);
      expect(result.orderChanged).toBe(true);
    });

    it("preserves note activities in their original positions", () => {
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a", { lat: 34.0, lng: 133.0 }), // Far
        makeNoteActivity("note1"),
        makePlaceActivity("b", { lat: 35.6, lng: 139.7 }), // Near start
      ];
      const result = optimizeRouteOrder(activities, startPoint);
      // Place activities get reordered: b (near) before a (far)
      // But note stays in its slot (index 1)
      expect(result.order[1]).toBe("note1");
      expect(result.order[0]).toBe("b"); // nearest place first
      expect(result.order[2]).toBe("a");
    });

    it("handles end point constraint", () => {
      const endPoint: EntryPoint = {
        type: "airport",
        id: "kix",
        name: "Kansai Int'l",
        coordinates: { lat: 34.4347, lng: 135.244 },
      };
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a", { lat: 35.6, lng: 139.7 }), // Tokyo
        makePlaceActivity("b", { lat: 34.7, lng: 135.5 }), // Osaka (near KIX)
        makePlaceActivity("c", { lat: 35.0, lng: 136.9 }), // Nagoya
      ];
      const result = optimizeRouteOrder(activities, startPoint, endPoint);
      // Last activity should be nearest to end point (Osaka)
      expect(result.order[result.order.length - 1]).toBe("b");
    });

    it("reports orderChanged = false when optimization matches original", () => {
      // One activity, already in position
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a", { lat: 35.6, lng: 139.7 }),
      ];
      const result = optimizeRouteOrder(activities, startPoint);
      expect(result.orderChanged).toBe(false);
      expect(result.optimizedCount).toBe(1);
    });

    it("tracks skipped count for activities without coordinates", () => {
      const activities: ItineraryActivity[] = [
        makePlaceActivity("a", { lat: 35.6, lng: 139.7 }),
        makePlaceActivity("b"), // no coords
        makePlaceActivity("c"), // no coords
      ];
      const result = optimizeRouteOrder(activities, startPoint);
      expect(result.optimizedCount).toBe(1);
      expect(result.skippedCount).toBe(2);
    });
  });
});
