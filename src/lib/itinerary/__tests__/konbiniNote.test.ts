import { describe, it, expect } from "vitest";
import { createKonbiniActivity, TIME_SLOT_BY_MEAL } from "../konbiniNote";

describe("createKonbiniActivity", () => {
  it("produces a note activity with breakfast copy", () => {
    const activity = createKonbiniActivity("breakfast", "morning");
    expect(activity.kind).toBe("note");
    expect(activity.timeOfDay).toBe("morning");
    if (activity.kind === "note") {
      expect(activity.notes).toContain("Konbini Breakfast");
      expect(activity.notes).toContain("onigiri");
    }
  });

  it("produces a note activity with lunch copy", () => {
    const activity = createKonbiniActivity("lunch", "afternoon");
    expect(activity.kind).toBe("note");
    expect(activity.timeOfDay).toBe("afternoon");
    if (activity.kind === "note") {
      expect(activity.notes).toContain("Konbini Lunch");
      expect(activity.notes).toContain("Bento");
    }
  });

  it("produces a note activity with dinner copy", () => {
    const activity = createKonbiniActivity("dinner", "evening");
    expect(activity.kind).toBe("note");
    expect(activity.timeOfDay).toBe("evening");
    if (activity.kind === "note") {
      expect(activity.notes).toContain("Konbini Dinner");
      expect(activity.notes).toContain("nikuman");
    }
  });

  it("generates a unique id per call", () => {
    const a = createKonbiniActivity("breakfast", "morning");
    const b = createKonbiniActivity("breakfast", "morning");
    expect(a.id).not.toBe(b.id);
  });

  it("maps meal types to canonical time slots", () => {
    expect(TIME_SLOT_BY_MEAL.breakfast).toBe("morning");
    expect(TIME_SLOT_BY_MEAL.lunch).toBe("afternoon");
    expect(TIME_SLOT_BY_MEAL.dinner).toBe("evening");
  });
});
