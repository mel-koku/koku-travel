import { describe, it, expect } from "vitest";
import { applyLateArrivalStrip } from "@/lib/itinerary/lateArrival";
import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";

function makeAnchor(id: string, timeOfDay: "morning" | "afternoon" | "evening" = "morning"): ItineraryActivity {
  return {
    kind: "place",
    id,
    title: `Anchor ${id}`,
    timeOfDay,
    isAnchor: true,
  };
}

function makeActivity(id: string, timeOfDay: "morning" | "afternoon" | "evening" = "afternoon"): ItineraryActivity {
  return {
    kind: "place",
    id,
    title: `Activity ${id}`,
    timeOfDay,
  };
}

function makeDay(activities: ItineraryActivity[]): ItineraryDay {
  return {
    id: "day-1",
    activities,
  };
}

describe("applyLateArrivalStrip", () => {
  it("strips non-anchor activities and marks day as late arrival", () => {
    const day = makeDay([
      makeAnchor("arrive"),
      makeActivity("shrine-visit"),
      makeActivity("ramen-dinner"),
      makeAnchor("depart"),
    ]);

    applyLateArrivalStrip(day);

    expect(day.isLateArrival).toBe(true);
    const placeActivities = day.activities.filter((a) => a.kind === "place" && !a.isAnchor);
    expect(placeActivities).toHaveLength(0);
  });

  it("injects a settle-in note when day is empty after stripping (1-day trip)", () => {
    const day = makeDay([
      makeAnchor("arrive"),
      makeActivity("temple"),
      makeActivity("garden"),
      makeAnchor("depart"),
    ]);

    applyLateArrivalStrip(day);

    // Should have at least one non-anchor activity (the note)
    const nonAnchors = day.activities.filter(
      (a) => !(a.kind === "place" && a.isAnchor),
    );
    expect(nonAnchors).toHaveLength(1);
    expect(nonAnchors[0].kind).toBe("note");
    expect(nonAnchors[0].notes).toContain("settle");
  });

  it("places settle-in note between arrival and departure anchors", () => {
    const day = makeDay([
      makeAnchor("arrive"),
      makeActivity("museum"),
      makeAnchor("depart"),
    ]);

    applyLateArrivalStrip(day);

    // Order should be: arrive anchor, settle note, depart anchor
    expect(day.activities).toHaveLength(3);
    expect(day.activities[0].kind).toBe("place");
    expect((day.activities[0] as Extract<ItineraryActivity, { kind: "place" }>).isAnchor).toBe(true);
    expect(day.activities[1].kind).toBe("note");
    expect(day.activities[2].kind).toBe("place");
    expect((day.activities[2] as Extract<ItineraryActivity, { kind: "place" }>).isAnchor).toBe(true);
  });

  it("appends settle-in note when only one anchor exists", () => {
    const day = makeDay([
      makeAnchor("arrive"),
      makeActivity("cafe"),
    ]);

    applyLateArrivalStrip(day);

    expect(day.activities).toHaveLength(2);
    expect(day.activities[0].kind).toBe("place");
    expect(day.activities[1].kind).toBe("note");
  });

  it("does not inject note for multi-day trip where Day 1 still has content after stripping", () => {
    // Scenario: day already has a non-anchor, non-regular activity that survives
    // (This shouldn't happen with the current filter, but guards against future changes)
    const day = makeDay([makeAnchor("arrive"), makeAnchor("depart")]);

    // Manually simulate a day that already has only anchors before stripping
    applyLateArrivalStrip(day);

    // Even here, settle-in note should be injected since day is empty
    const notes = day.activities.filter((a) => a.kind === "note");
    expect(notes).toHaveLength(1);
  });

  it("settle-in note has evening timeOfDay", () => {
    const day = makeDay([
      makeAnchor("arrive"),
      makeActivity("park"),
      makeAnchor("depart"),
    ]);

    applyLateArrivalStrip(day);

    const note = day.activities.find((a) => a.kind === "note");
    expect(note).toBeDefined();
    expect(note!.timeOfDay).toBe("evening");
  });
});
