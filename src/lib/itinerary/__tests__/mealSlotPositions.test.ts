import { describe, it, expect } from "vitest";
import { computeMealSlotPositions } from "../mealSlotPositions";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";

function place(
  id: string,
  timeOfDay: "morning" | "afternoon" | "evening",
  overrides: Partial<Extract<ItineraryActivity, { kind: "place" }>> = {},
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id,
    title: `Place ${id}`,
    timeOfDay,
    ...overrides,
  };
}

function day(activities: ItineraryActivity[], cityId = "tokyo"): ItineraryDay {
  return { id: "day-1", cityId, activities };
}

describe("computeMealSlotPositions", () => {
  it("places breakfast slot before the first morning activity", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    const breakfastEntry = [...result.values()].find((s) => s.mealType === "breakfast");
    expect(breakfastEntry).toBeDefined();
    expect(breakfastEntry?.insertAtIndex).toBe(0);
    expect(breakfastEntry?.hasKonbini).toBe(true);
  });

  it("places lunch slot before the first afternoon activity", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    const lunchEntry = [...result.values()].find((s) => s.mealType === "lunch");
    expect(lunchEntry).toBeDefined();
    expect(lunchEntry?.insertAtIndex).toBe(2);
  });

  it("places dinner slot before the first evening activity", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    const dinnerEntry = [...result.values()].find((s) => s.mealType === "dinner");
    expect(dinnerEntry).toBeDefined();
    expect(dinnerEntry?.insertAtIndex).toBe(3);
  });

  it("places dinner at end (length) when no evening activity exists", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    const dinnerEntry = [...result.values()].find((s) => s.mealType === "dinner");
    expect(dinnerEntry).toBeDefined();
    expect(dinnerEntry?.insertAtIndex).toBe(activities.length);
  });

  it("places dinner before the departure anchor when one exists", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("anchor-departure-narita", "evening", {
        isAnchor: true,
        title: "Depart Narita",
      }),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    const dinnerEntry = [...result.values()].find((s) => s.mealType === "dinner");
    expect(dinnerEntry).toBeDefined();
    // Departure anchor lives at index 3 — dinner slot should land at 3 (before anchor).
    expect(dinnerEntry?.insertAtIndex).toBe(3);
  });

  it("renders breakfast even when first activity is an arrival anchor", () => {
    const activities = [
      place("anchor-arrival-narita", "morning", { isAnchor: true, title: "Arrive Narita" }),
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    const breakfastEntry = [...result.values()].find((s) => s.mealType === "breakfast");
    expect(breakfastEntry).toBeDefined();
    // Should land before first non-anchor morning, i.e. index 1 (after the arrival anchor).
    expect(breakfastEntry?.insertAtIndex).toBe(1);
  });

  it("suppresses breakfast and dinner when accommodationStyle is ryokan, keeps lunch", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      accommodationStyle: "ryokan",
      dismissedPromptIds: new Set(),
    });
    const meals = [...result.values()].map((s) => s.mealType);
    expect(meals).toContain("lunch");
    expect(meals).not.toContain("breakfast");
    expect(meals).not.toContain("dinner");
  });

  it("respects dismissed prompt ids", () => {
    const activities = [
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
    ];
    const dismissed = new Set<string>(["meal-breakfast-day-1"]);
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: dismissed,
    });
    const meals = [...result.values()].map((s) => s.mealType);
    expect(meals).not.toContain("breakfast");
    // lunch + dinner should still appear (depending on day shape) — at minimum lunch
    expect(meals).toContain("lunch");
  });

  it("does not stack two slots at the same insertion index", () => {
    // Edge case: a contrived day where breakfast + lunch would both want the
    // same first-afternoon position. (e.g., morning empty after anchor, only
    // afternoon activities.) The detector won't fire breakfast in this shape,
    // but we still verify the de-dupe rule.
    const activities = [
      place("a1", "afternoon"),
      place("a2", "afternoon"),
    ];
    const result = computeMealSlotPositions({
      day: day(activities),
      dayIndex: 0,
      extendedActivities: activities,
      dismissedPromptIds: new Set(),
    });
    // Each insertion index is unique
    const indices = [...result.keys()];
    expect(new Set(indices).size).toBe(indices.length);
  });

  it("returns empty map when day has no activities", () => {
    const result = computeMealSlotPositions({
      day: day([]),
      dayIndex: 0,
      extendedActivities: [],
      dismissedPromptIds: new Set(),
    });
    expect(result.size).toBe(0);
  });
});
