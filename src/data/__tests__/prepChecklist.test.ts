import { describe, it, expect } from "vitest";
import { PREP_CHECKLIST, countPrepProgress, isPrepItemId } from "../prepChecklist";
import type { StoredTrip } from "@/services/trip/types";

function makeTrip(overrides: Partial<StoredTrip["builderData"]> & { prepState?: StoredTrip["prepState"] }): StoredTrip {
  const builderDefaults = {
    duration: 5,
    cities: ["tokyo"],
    regions: ["kanto"],
    dates: { start: "2026-05-01", end: "2026-05-05" },
    vibes: [],
    pace: "moderate",
    groupType: "couple",
    sameAsEntry: true,
  };
  const { prepState, ...builder } = overrides;
  return {
    id: "t1",
    name: "Test",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-01",
    itinerary: { days: [] } as unknown as StoredTrip["itinerary"],
    builderData: { ...builderDefaults, ...builder } as unknown as StoredTrip["builderData"],
    prepState,
  } as StoredTrip;
}

describe("PREP_CHECKLIST", () => {
  it("has 19 items", () => {
    expect(PREP_CHECKLIST).toHaveLength(19);
  });

  it("has unique item IDs", () => {
    const ids = PREP_CHECKLIST.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has non-empty title and body under reasonable length", () => {
    for (const item of PREP_CHECKLIST) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.title.length).toBeLessThanOrEqual(60);
      expect(item.body.length).toBeGreaterThan(0);
    }
  });

  it("brand-voice deny-list has no hits in titles or bodies", () => {
    const deny = /\b(unforgettable|vibrant|hidden gem|off the beaten path|bucket list|stunning|breathtaking|must-see|delve|discover|wander|immerse|journey|tapestry|world-class)\b/i;
    for (const item of PREP_CHECKLIST) {
      expect(item.title).not.toMatch(deny);
      expect(item.body).not.toMatch(deny);
    }
  });
});

describe("isPrepItemId", () => {
  it("returns true for known IDs", () => {
    expect(isPrepItemId("passport-validity")).toBe(true);
    expect(isPrepItemId("travel-insurance")).toBe(true);
  });

  it("returns false for unknown strings", () => {
    expect(isPrepItemId("nonsense")).toBe(false);
    expect(isPrepItemId("")).toBe(false);
  });
});

describe("countPrepProgress", () => {
  it("returns total excluding conditionals that don't apply", () => {
    // 1-city 5-day trip with no onsen: none of the 4 conditionals apply
    const trip = makeTrip({});
    const { total } = countPrepProgress(trip);
    expect(total).toBe(15); // 4 + 3 + 5 + 3 always-shown = 15
  });

  it("counts matched conditionals (typhoon-buffer during Aug 20)", () => {
    const trip = makeTrip({ dates: { start: "2026-08-20", end: "2026-08-25" } });
    const { total } = countPrepProgress(trip);
    expect(total).toBe(16); // 15 + typhoon-buffer
  });

  it("counts checked items toward done", () => {
    const trip = makeTrip({
      prepState: { "passport-validity": true, "travel-insurance": true, "no-tipping": false },
    });
    const { done } = countPrepProgress(trip);
    expect(done).toBe(2);
  });

  it("ignores orphaned keys in prepState (items removed from code)", () => {
    const trip = makeTrip({
      prepState: { "passport-validity": true, "removed-old-item": true },
    });
    const { done } = countPrepProgress(trip);
    expect(done).toBe(1);
  });
});

describe("conditional triggers", () => {
  it("takkyubin fires for 3+ cities AND 7+ days, not for smaller trips", () => {
    const item = PREP_CHECKLIST.find((i) => i.id === "takkyubin")!;
    expect(item.condition).toBeDefined();

    expect(item.condition!(makeTrip({
      cities: ["tokyo", "kyoto", "osaka"],
      duration: 10,
    }))).toBe(true);

    // 3 cities but only 4 days
    expect(item.condition!(makeTrip({
      cities: ["tokyo", "kyoto", "osaka"],
      duration: 4,
    }))).toBe(false);

    // 2 cities, 10 days
    expect(item.condition!(makeTrip({
      cities: ["tokyo", "kyoto"],
      duration: 10,
    }))).toBe(false);
  });

  it("typhoon-buffer fires Aug 15 - Oct 15 only", () => {
    const item = PREP_CHECKLIST.find((i) => i.id === "typhoon-buffer")!;

    expect(item.condition!(makeTrip({ dates: { start: "2026-09-01", end: "2026-09-05" } }))).toBe(true);
    expect(item.condition!(makeTrip({ dates: { start: "2026-08-15", end: "2026-08-18" } }))).toBe(true);
    expect(item.condition!(makeTrip({ dates: { start: "2026-10-15", end: "2026-10-18" } }))).toBe(true);

    expect(item.condition!(makeTrip({ dates: { start: "2026-08-10", end: "2026-08-14" } }))).toBe(false);
    expect(item.condition!(makeTrip({ dates: { start: "2026-10-16", end: "2026-10-20" } }))).toBe(false);
    expect(item.condition!(makeTrip({ dates: { start: "2026-05-01", end: "2026-05-05" } }))).toBe(false);
  });

  it("jr-pass-decision fires for 3+ transit legs", () => {
    const item = PREP_CHECKLIST.find((i) => i.id === "jr-pass-decision")!;

    const manyLegsDay = {
      id: "d1",
      activities: [
        { kind: "place", id: "a1" },
        { kind: "place", id: "a2", travelFromPrevious: { mode: "train", durationMinutes: 30 } },
        { kind: "place", id: "a3", travelFromPrevious: { mode: "subway", durationMinutes: 15 } },
        { kind: "place", id: "a4", travelFromPrevious: { mode: "transit", durationMinutes: 20 } },
      ],
    };
    const trip = makeTrip({});
    (trip.itinerary as unknown as { days: unknown[] }).days = [manyLegsDay];

    expect(item.condition!(trip)).toBe(true);
  });

  it("onsen-tattoos fires when any activity category is onsen", () => {
    const item = PREP_CHECKLIST.find((i) => i.id === "onsen-tattoos")!;
    const trip = makeTrip({});
    (trip.itinerary as unknown as { days: unknown[] }).days = [
      {
        id: "d1",
        activities: [{ kind: "place", id: "a1", category: "onsen" }],
      },
    ];
    expect(item.condition!(trip)).toBe(true);
  });

  it("onsen-tattoos does NOT fire for itineraries without onsen", () => {
    const item = PREP_CHECKLIST.find((i) => i.id === "onsen-tattoos")!;
    const trip = makeTrip({});
    (trip.itinerary as unknown as { days: unknown[] }).days = [
      {
        id: "d1",
        activities: [{ kind: "place", id: "a1", category: "shrine" }],
      },
    ];
    expect(item.condition!(trip)).toBe(false);
  });
});
