import { describe, it, expect } from "vitest";
import { detectMealGaps } from "../mealGapDetector";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";

function place(
  id: string,
  timeOfDay: "morning" | "afternoon" | "evening",
  arrivalTime?: string,
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id,
    title: `Place ${id}`,
    timeOfDay,
    locationId: id,
    schedule: arrivalTime
      ? { arrivalTime, departureTime: arrivalTime, status: "scheduled" }
      : undefined,
  };
}

function day(activities: ItineraryActivity[]): ItineraryDay {
  return {
    id: "d0",
    cityId: "tokyo",
    activities,
  } as ItineraryDay;
}

describe("detectMealGaps", () => {
  it("fires lunch when two stops span lunch hours, even if their stale timeOfDay says 'evening'", () => {
    // Regression for the user-reported bug: a day where every activity got
    // tagged "evening" at generation but was rescheduled to early afternoon
    // by the planner. Earlier filter logic read `timeOfDay` directly and
    // counted zero afternoon-bucket activities → no lunch gap fired.
    const activities = [
      place("a1", "evening", "12:00"),
      place("a2", "evening", "13:22"),
      place("a3", "evening", "14:47"),
      place("a4", "evening", "15:56"),
    ];
    const gaps = detectMealGaps(day(activities), 0);
    const lunchAddMeal = gaps.find(
      (g) => g.action.type === "add_meal" && g.action.mealType === "lunch",
    );
    expect(lunchAddMeal).toBeDefined();
  });

  it("fires breakfast when an activity is scheduled before noon, regardless of stale tag", () => {
    const activities = [
      place("a1", "evening", "09:00"),
      place("a2", "evening", "13:00"),
    ];
    const gaps = detectMealGaps(day(activities), 0);
    const breakfast = gaps.find(
      (g) => g.action.type === "add_meal" && g.action.mealType === "breakfast",
    );
    expect(breakfast).toBeDefined();
  });

  it("falls back to timeOfDay when schedule.arrivalTime is missing", () => {
    // Defensive — old/imported activities without a schedule should still
    // flow through the original logic.
    const activities = [
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
    ];
    const gaps = detectMealGaps(day(activities), 0);
    expect(gaps.find((g) => g.action.type === "add_meal" && g.action.mealType === "breakfast")).toBeDefined();
    expect(gaps.find((g) => g.action.type === "add_meal" && g.action.mealType === "lunch")).toBeDefined();
    expect(gaps.find((g) => g.action.type === "add_meal" && g.action.mealType === "dinner")).toBeDefined();
  });

  it("suppresses breakfast when no activity is scheduled before noon", () => {
    const activities = [
      place("a1", "evening", "13:00"),
      place("a2", "evening", "16:00"),
    ];
    const gaps = detectMealGaps(day(activities), 0);
    expect(gaps.find((g) => g.action.type === "add_meal" && g.action.mealType === "breakfast")).toBeUndefined();
  });
});
