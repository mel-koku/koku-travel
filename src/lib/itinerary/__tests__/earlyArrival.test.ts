import { describe, it, expect } from "vitest";
import { applyEarlyArrivalStrip } from "@/lib/itinerary/earlyArrival";
import { applyLateArrivalStrip } from "@/lib/itinerary/lateArrival";
import {
  EARLY_ARRIVAL_THRESHOLD,
  LATE_ARRIVAL_THRESHOLD,
  computeRawEffectiveArrival,
} from "@/lib/utils/airportBuffer";
import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";

function makeAnchor(
  id: string,
  timeOfDay: "morning" | "afternoon" | "evening" = "morning",
): ItineraryActivity {
  return {
    kind: "place",
    id,
    title: `Anchor ${id}`,
    timeOfDay,
    isAnchor: true,
  };
}

function makeActivity(
  id: string,
  timeOfDay: "morning" | "afternoon" | "evening" = "morning",
): ItineraryActivity {
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

/**
 * Mirrors the engine's gating logic so we can verify thresholds without
 * spinning up the full itinerary engine. Keep this in sync with the branch
 * in `src/lib/server/itineraryEngine.ts` (search "Late / early arrival").
 */
function pickStripForArrival(
  arrivalTime: string | undefined,
  iata?: string,
): "late" | "early" | "none" {
  if (!arrivalTime) return "none";
  const rawEffective = computeRawEffectiveArrival(arrivalTime, iata);
  if (rawEffective === null) return "none";
  if (rawEffective >= LATE_ARRIVAL_THRESHOLD) return "late";
  if (rawEffective < EARLY_ARRIVAL_THRESHOLD) return "early";
  return "none";
}

describe("applyEarlyArrivalStrip", () => {
  it("strips non-anchor activities, marks day, and injects settle-in note (case 1: 05:00 effective)", () => {
    // arrivalTime 03:00 + intl 60m + transit 60m (NRT) = 05:00 effective
    expect(pickStripForArrival("03:00", "NRT")).toBe("early");

    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("shrine-visit"),
      makeActivity("ramen-lunch"),
    ]);

    applyEarlyArrivalStrip(day);

    expect(day.isEarlyArrival).toBe(true);
    const nonAnchors = day.activities.filter(
      (a) => !(a.kind === "place" && a.isAnchor),
    );
    expect(nonAnchors).toHaveLength(1);
    expect(nonAnchors[0]!.kind).toBe("note");
  });

  it("strips on 06:00 effective arrival (case 2)", () => {
    // arrivalTime 04:00 + intl 60m + transit 60m (NRT) = 06:00 effective
    expect(pickStripForArrival("04:00", "NRT")).toBe("early");

    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("museum"),
    ]);

    applyEarlyArrivalStrip(day);
    expect(day.isEarlyArrival).toBe(true);
  });

  it("does NOT strip when effective arrival is exactly 08:00 (case 3: at threshold)", () => {
    // arrivalTime 06:00 + intl 60m + transit 60m (NRT) = 08:00 effective
    // Strict < threshold means 08:00 is NOT stripped.
    expect(pickStripForArrival("06:00", "NRT")).toBe("none");
  });

  it("late-arrival path takes precedence at 19:30 effective (case 4)", () => {
    // arrivalTime 18:30 + intl 60m + transit 60m (NRT) = 20:30 effective.
    // Use 17:30 + buffers = 19:30 effective.
    // arrivalTime 17:30 + intl 60m + transit 60m (NRT) = 19:30 effective → late
    expect(pickStripForArrival("17:30", "NRT")).toBe("late");

    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("dinner"),
    ]);
    applyLateArrivalStrip(day);
    expect(day.isLateArrival).toBe(true);

    // Engine would not call applyEarlyArrivalStrip in this branch, but even if
    // something did, the strip must no-op when isLateArrival is set.
    applyEarlyArrivalStrip(day);
    expect(day.isEarlyArrival).toBeUndefined();
    // Note injected by late strip should still be evening-time, not morning.
    const note = day.activities.find((a) => a.kind === "note");
    expect(note?.timeOfDay).toBe("evening");
  });

  it("never fires alongside late arrival on the same day (case 5: gate)", () => {
    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("shrine"),
    ]);

    // Simulate late strip already having fired.
    day.isLateArrival = true;
    const beforeCount = day.activities.length;

    applyEarlyArrivalStrip(day);

    expect(day.isEarlyArrival).toBeUndefined();
    expect(day.activities).toHaveLength(beforeCount);
  });

  it("preserves Day 1 anchors through the strip (case 6)", () => {
    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("temple"),
      makeActivity("garden"),
      makeActivity("dinner"),
    ]);

    applyEarlyArrivalStrip(day);

    const anchors = day.activities.filter(
      (a) => a.kind === "place" && a.isAnchor,
    );
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.id).toBe("anchor-arrival-nrt");
  });

  it("does not strip when no arrival time is set (case 7)", () => {
    expect(pickStripForArrival(undefined)).toBe("none");
    expect(pickStripForArrival("")).toBe("none");
  });

  it("settle-in note is server-side, not motion-gated (case 8: a11y)", () => {
    // Reduced-motion users get the same logical behavior because the strip
    // is a server-side data mutation. No animation primitives or motion
    // checks are involved. This test asserts the note is plain data.
    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("shrine"),
    ]);

    applyEarlyArrivalStrip(day);

    const note = day.activities.find((a) => a.kind === "note");
    expect(note).toBeDefined();
    expect(note!.kind).toBe("note");
    // Note has plain text, not motion or interaction props.
    expect(typeof note!.notes).toBe("string");
    expect(note!.notes!.length).toBeGreaterThan(0);
    // Settle-in note sits at the start of the day (after the arrival anchor).
    expect(day.activities[0]!.kind).toBe("place");
    expect((day.activities[0] as Extract<ItineraryActivity, { kind: "place" }>).isAnchor).toBe(true);
    expect(day.activities[1]!.kind).toBe("note");
  });

  it("places settle-in note at the very front when no anchor exists", () => {
    const day = makeDay([makeActivity("temple"), makeActivity("garden")]);

    applyEarlyArrivalStrip(day);

    // After stripping non-anchors, no anchor is left, so the note is unshifted.
    expect(day.activities).toHaveLength(1);
    expect(day.activities[0]!.kind).toBe("note");
  });

  it("does not include em-dashes in user-facing copy", () => {
    const day = makeDay([
      makeAnchor("anchor-arrival-nrt"),
      makeActivity("shrine"),
    ]);

    applyEarlyArrivalStrip(day);

    const note = day.activities.find((a) => a.kind === "note");
    expect(note).toBeDefined();
    expect(note!.notes).not.toMatch(/—/);
  });
});
