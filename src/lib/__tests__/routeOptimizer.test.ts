import { describe, it, expect } from "vitest";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
import type { ItineraryActivity } from "@/types/itinerary";
import type { EntryPoint } from "@/types/trip";

const place = (
  id: string,
  lat: number,
  lng: number,
  overrides: Partial<Extract<ItineraryActivity, { kind: "place" }>> = {},
): ItineraryActivity =>
  ({
    kind: "place",
    id,
    title: id,
    timeOfDay: "morning",
    coordinates: { lat, lng },
    ...overrides,
  }) as ItineraryActivity;

const ep = (lat: number, lng: number): EntryPoint =>
  ({ coordinates: { lat, lng } }) as EntryPoint;

// APA Hotel ~ Ueno area. Stops are around Tokyo at varying distances.
const APA = ep(35.7141, 139.7775);

describe("optimizeRouteOrder", () => {
  it("reorders unpinned activities by nearest-neighbor from startPoint", () => {
    // Without pinning, the optimizer should pick the geographically nearest
    // activity first.
    const activities = [
      place("far", 35.6586, 139.7454), // Tokyo Tower (~6km from APA)
      place("near", 35.7139, 139.7779), // ~50m from APA
      place("mid", 35.6938, 139.7034), // Shinjuku (~7km)
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    expect(result.order[0]).toBe("near");
  });

  it("pins arrival anchor to position 0 even when geographically far", () => {
    // The arrival airport (NRT) is ~70km from central Tokyo. Pure
    // nearest-neighbor would put it last (the route needs to come back near
    // the hotel). But arrival anchors represent fixed events: the user lands
    // there, so it must be the day's first stop.
    const activities = [
      place("kyoto-stop-1", 35.7140, 139.7770), // near APA
      place("anchor-arrival-nrt", 35.7647, 140.3863, { isAnchor: true }),
      place("kyoto-stop-2", 35.7160, 139.7790), // near APA
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    expect(result.order[0]).toBe("anchor-arrival-nrt");
  });

  it("pins departure anchor to the last position", () => {
    const activities = [
      place("anchor-departure-kix", 34.4347, 135.2440, { isAnchor: true }),
      place("stop-1", 34.6937, 135.5023), // Osaka
      place("stop-2", 34.6917, 135.5025),
    ];
    const result = optimizeRouteOrder(
      activities,
      ep(34.6937, 135.5023),
      ep(34.6937, 135.5023),
    );
    expect(result.order[result.order.length - 1]).toBe("anchor-departure-kix");
  });

  it("pins mealType activities to their input position", () => {
    // The meal-slot handler placed Doutor at position 0 (breakfast — before
    // all morning stops). Geographic optimization must not push it later in
    // the day even though other stops are physically nearer to the hotel.
    const activities = [
      place("custom-doutor", 35.7141, 139.7775, {
        isCustom: true,
        mealType: "breakfast",
      }),
      place("ueno-toshogu", 35.7184, 139.7714),
      place("yanaka-cemetery", 35.7261, 139.7671),
      place("tokyo-dome", 35.7058, 139.7519),
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    expect(result.order[0]).toBe("custom-doutor");
  });

  it("pins arrival anchor + meal type simultaneously and only optimizes the rest", () => {
    // Real user scenario: engine prepends the arrival anchor at position 0;
    // the meal-slot handler inserts Doutor at position 1 (first non-anchor).
    // The optimizer must keep both pinned and only reorder the 5 sightseeing
    // stops between them.
    const activities = [
      place("anchor-arrival-nrt", 35.7647, 140.3863, { isAnchor: true }),
      place("custom-doutor", 35.7141, 139.7775, {
        isCustom: true,
        mealType: "breakfast",
      }),
      place("ueno", 35.7184, 139.7714),
      place("yanaka", 35.7261, 139.7671),
      place("tennoji", 35.7245, 139.7670),
      place("yanesen", 35.7232, 139.7680),
      place("tokyo-dome", 35.7058, 139.7519),
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    expect(result.order[0]).toBe("anchor-arrival-nrt");
    expect(result.order[1]).toBe("custom-doutor");
    expect(result.order.slice(2).sort()).toEqual(
      ["tennoji", "tokyo-dome", "ueno", "yanaka", "yanesen"].sort(),
    );
  });

  it("optimizes movables from the trailing pinned activity, not from startPoint", () => {
    // When an arrival anchor (or any pinned activity) is at position 0, the
    // first movable should be optimized as the nearest neighbor to the
    // anchor's coords, not to the day's startPoint (which may be a hotel
    // far from the airport). Without this, on Day 1 with NRT pinned at 0,
    // nearest-neighbor picks "stop nearest to APA hotel" instead of
    // "stop nearest to NRT" — backward routing.
    const NRT = { lat: 35.7647, lng: 140.3863 };
    // Three movables, varying distances from APA Hotel and NRT.
    const activities = [
      place("anchor-arrival-nrt", NRT.lat, NRT.lng, { isAnchor: true }),
      place("near-apa", 35.7142, 139.7775), // ~50m from APA, ~70km from NRT
      place("near-nrt", 35.7600, 140.3800), // ~6km from NRT, far from APA
      place("middle", 35.7400, 140.0800), // between APA and NRT
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    expect(result.order[0]).toBe("anchor-arrival-nrt");
    // Movable nearest to NRT should be picked first, not movable nearest to APA.
    expect(result.order[1]).toBe("near-nrt");
  });

  it("does not flip orderChanged when pinAnchorsToEnds is the only mover", () => {
    // Stale model state: arrival anchor sits at the end of the input array
    // (not position 0). pinAnchorsToEnds relocates it to position 0, but the
    // movable stops are already in nearest-neighbor order from the anchor.
    // Anchor relocation alone is structural — the optimizer made no movable
    // decisions, so callers should see orderChanged=false and skip the
    // rebuild/persist cycle.
    const NRT = { lat: 35.7647, lng: 140.3863 };
    const activities = [
      place("near-nrt", 35.7600, 140.3800), // ~6km from NRT
      place("middle", 35.7400, 140.0800), // ~30km from NRT
      place("near-apa", 35.7142, 139.7780), // ~50m from APA, ~70km from NRT
      place("anchor-arrival-nrt", NRT.lat, NRT.lng, { isAnchor: true }),
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    expect(result.order).toEqual([
      "anchor-arrival-nrt",
      "near-nrt",
      "middle",
      "near-apa",
    ]);
    expect(result.orderChanged).toBe(false);
  });

  it("preserves notes in their original positions among reordered places", () => {
    const noteAct: ItineraryActivity = {
      kind: "note",
      id: "note-1",
      content: "Pack umbrella",
    } as unknown as ItineraryActivity;
    const activities = [
      place("far", 35.6586, 139.7454),
      noteAct,
      place("near", 35.7139, 139.7779),
    ];
    const result = optimizeRouteOrder(activities, APA, APA);
    // Note still at index 1 even after places reordered.
    expect(result.order[1]).toBe("note-1");
  });
});
