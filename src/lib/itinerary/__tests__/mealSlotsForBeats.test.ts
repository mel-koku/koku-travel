import { describe, it, expect } from "vitest";
import { computeBeatMealSlotInsertions } from "../mealSlotsForBeats";
import type { ItineraryActivity } from "@/types/itinerary";
import type { ChapterBeat } from "@/components/features/itinerary/chapter/ChapterList";
import type { Location } from "@/types/location";

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
    locationId: id,
    ...overrides,
  };
}

function loc(id: string, name = `Loc ${id}`): Location {
  return { id, name } as Location;
}

function beat(
  id: string,
  partOfDay: ChapterBeat["partOfDay"],
  time = "10:00",
): ChapterBeat {
  return {
    id,
    time,
    partOfDay,
    location: loc(id),
    body: "",
    chips: [],
    hasMore: false,
    transitToNext: null,
  };
}

describe("computeBeatMealSlotInsertions", () => {
  it("places breakfast slot before the first beat later than 08:00", () => {
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const beats = [
      beat("a1", "Morning", "09:00"),
      beat("a2", "Midday", "12:30"),
      beat("a3", "Afternoon", "15:00"),
      beat("a4", "Evening", "19:00"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      dismissedPromptIds: new Set(),
    });
    const breakfast = insertions.find((i) => i.mealType === "breakfast");
    expect(breakfast?.beforeBeatId).toBe("a1");
  });

  it("places lunch slot before the first beat later than 12:30", () => {
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const beats = [
      beat("a1", "Morning", "09:00"),
      beat("a2", "Morning", "10:30"),
      beat("a3", "Midday", "13:00"),
      beat("a4", "Evening", "19:00"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      dismissedPromptIds: new Set(),
    });
    const lunch = insertions.find((i) => i.mealType === "lunch");
    expect(lunch?.beforeBeatId).toBe("a3");
  });

  it("places dinner slot before the first beat later than 19:00", () => {
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const beats = [
      beat("a1", "Morning", "09:00"),
      beat("a2", "Morning", "10:30"),
      beat("a3", "Midday", "13:00"),
      beat("a4", "Evening", "19:30"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      dismissedPromptIds: new Set(),
    });
    const dinner = insertions.find((i) => i.mealType === "dinner");
    expect(dinner?.beforeBeatId).toBe("a4");
  });

  it("places dinner at end (beforeBeatId=null) when no beat is later than 19:00", () => {
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
    ];
    const beats = [
      beat("a1", "Morning", "09:00"),
      beat("a2", "Morning", "10:30"),
      beat("a3", "Midday", "13:00"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      dismissedPromptIds: new Set(),
    });
    const dinner = insertions.find((i) => i.mealType === "dinner");
    expect(dinner).toBeDefined();
    expect(dinner?.beforeBeatId).toBeNull();
  });

  it("places breakfast before the first beat even when no Morning bucket exists", () => {
    // Regression: when day starts late (first beat at 12:00), an earlier
    // implementation looked for a "Morning" partOfDay beat; finding none,
    // it dropped the breakfast slot to the bottom of the spine. Now slots
    // position purely by time, so 08:00 lands above the 12:00 beat.
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
    ];
    const beats = [
      beat("a1", "Midday", "12:00"),
      beat("a2", "Midday", "13:22"),
      beat("a3", "Afternoon", "15:00"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      dismissedPromptIds: new Set(),
    });
    const breakfast = insertions.find((i) => i.mealType === "breakfast");
    expect(breakfast?.beforeBeatId).toBe("a1");
  });

  it("suppresses breakfast and dinner slots when accommodationStyle is ryokan", () => {
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "morning"),
      place("a3", "afternoon"),
      place("a4", "evening"),
    ];
    const beats = [
      beat("a1", "Morning", "09:00"),
      beat("a2", "Morning", "10:30"),
      beat("a3", "Midday", "13:00"),
      beat("a4", "Evening", "19:00"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      accommodationStyle: "ryokan",
      dismissedPromptIds: new Set(),
    });
    const meals = insertions.map((i) => i.mealType);
    expect(meals).toContain("lunch");
    expect(meals).not.toContain("breakfast");
    expect(meals).not.toContain("dinner");
  });

  it("respects dismissedPromptIds", () => {
    const dayActivities = [
      place("a1", "morning"),
      place("a2", "afternoon"),
      place("a3", "afternoon"),
    ];
    const beats = [
      beat("a1", "Morning", "09:00"),
      beat("a2", "Midday", "13:00"),
      beat("a3", "Afternoon", "15:00"),
    ];
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities,
      beats,
      dismissedPromptIds: new Set(["meal-breakfast-day-1"]),
    });
    const meals = insertions.map((i) => i.mealType);
    expect(meals).not.toContain("breakfast");
    expect(meals).toContain("lunch");
  });

  it("returns empty when day has no activities", () => {
    const insertions = computeBeatMealSlotInsertions({
      dayId: "day-1",
      dayIndex: 0,
      cityId: "tokyo",
      dayActivities: [],
      beats: [],
      dismissedPromptIds: new Set(),
    });
    expect(insertions).toEqual([]);
  });
});
