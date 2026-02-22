import { describe, it, expect } from "vitest";
import {
  detectItineraryConflicts,
  getDayConflicts,
  getActivityConflicts,
  hasActivityConflicts,
} from "@/lib/validation/itineraryConflicts";
import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";

function makePlaceActivity(
  overrides: Partial<Extract<ItineraryActivity, { kind: "place" }>> = {},
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id: "activity-1",
    title: "Test Activity",
    timeOfDay: "morning",
    ...overrides,
  };
}

function makeDay(activities: ItineraryActivity[], overrides: Partial<ItineraryDay> = {}): ItineraryDay {
  return {
    id: "day-1",
    activities,
    ...overrides,
  };
}

function makeItinerary(days: ItineraryDay[]): Itinerary {
  return { days };
}

describe("itineraryConflicts", () => {
  describe("detectItineraryConflicts", () => {
    it("returns no conflicts for empty itinerary", () => {
      const result = detectItineraryConflicts({ days: [] });
      expect(result.conflicts).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("returns no conflicts for day with no issues", () => {
      const activity = makePlaceActivity({
        schedule: {
          arrivalTime: "10:00",
          departureTime: "11:00",
        },
        operatingWindow: {
          opensAt: "09:00",
          closesAt: "17:00",
        },
      });
      const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
      expect(result.conflicts).toHaveLength(0);
    });

    describe("closed during visit", () => {
      it("detects arrival before opening", () => {
        const activity = makePlaceActivity({
          id: "early-bird",
          schedule: {
            arrivalTime: "07:00",
            departureTime: "08:00",
          },
          operatingWindow: {
            opensAt: "09:00",
            closesAt: "17:00",
          },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        const conflict = result.conflicts.find((c) => c.type === "closed_during_visit");
        expect(conflict).toBeDefined();
        expect(conflict!.severity).toBe("error");
        expect(conflict!.message).toContain("opens at 09:00");
      });

      it("detects departure after closing", () => {
        const activity = makePlaceActivity({
          id: "late-stay",
          schedule: {
            arrivalTime: "16:00",
            departureTime: "18:00",
          },
          operatingWindow: {
            opensAt: "09:00",
            closesAt: "17:00",
          },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        const conflict = result.conflicts.find((c) => c.type === "closed_during_visit");
        expect(conflict).toBeDefined();
        expect(conflict!.message).toContain("Closes at 17:00");
      });

      it("handles overnight venues correctly", () => {
        // Bar opens at 18:00, closes at 02:00
        const activity = makePlaceActivity({
          id: "night-bar",
          schedule: {
            arrivalTime: "20:00",
            departureTime: "23:00",
          },
          operatingWindow: {
            opensAt: "18:00",
            closesAt: "02:00",
          },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        expect(result.conflicts.filter((c) => c.type === "closed_during_visit")).toHaveLength(0);
      });

      it("detects visit outside overnight venue hours", () => {
        // Bar opens at 18:00, closes at 02:00 — visiting at 10:00
        const activity = makePlaceActivity({
          id: "daytime-bar",
          schedule: {
            arrivalTime: "10:00",
            departureTime: "11:00",
          },
          operatingWindow: {
            opensAt: "18:00",
            closesAt: "02:00",
          },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        expect(result.conflicts.filter((c) => c.type === "closed_during_visit")).toHaveLength(1);
      });

      it("skips activities without schedule or operating window", () => {
        const activity = makePlaceActivity({ id: "no-schedule" });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        expect(result.conflicts.filter((c) => c.type === "closed_during_visit")).toHaveLength(0);
      });
    });

    describe("insufficient travel time", () => {
      it("detects gap shorter than travel time", () => {
        const a1 = makePlaceActivity({
          id: "a1",
          title: "Place A",
          schedule: { arrivalTime: "09:00", departureTime: "10:00" },
        });
        const a2 = makePlaceActivity({
          id: "a2",
          title: "Place B",
          schedule: { arrivalTime: "10:10", departureTime: "11:00" },
          travelFromPrevious: { mode: "walk", durationMinutes: 20 },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([a1, a2])]));
        const conflict = result.conflicts.find((c) => c.type === "insufficient_travel_time");
        expect(conflict).toBeDefined();
        expect(conflict!.severity).toBe("warning");
        expect(conflict!.details?.gapMinutes).toBe(10);
        expect(conflict!.details?.travelTime).toBe(20);
      });

      it("detects negative gap as error severity", () => {
        const a1 = makePlaceActivity({
          id: "a1",
          title: "Place A",
          schedule: { arrivalTime: "09:00", departureTime: "10:30" },
        });
        const a2 = makePlaceActivity({
          id: "a2",
          title: "Place B",
          schedule: { arrivalTime: "10:00", departureTime: "11:00" },
          travelFromPrevious: { mode: "walk", durationMinutes: 15 },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([a1, a2])]));
        const conflict = result.conflicts.find((c) => c.type === "insufficient_travel_time");
        expect(conflict).toBeDefined();
        expect(conflict!.severity).toBe("error");
      });

      it("no conflict when gap exceeds travel time", () => {
        const a1 = makePlaceActivity({
          id: "a1",
          schedule: { arrivalTime: "09:00", departureTime: "10:00" },
        });
        const a2 = makePlaceActivity({
          id: "a2",
          schedule: { arrivalTime: "10:30", departureTime: "11:30" },
          travelFromPrevious: { mode: "walk", durationMinutes: 15 },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([a1, a2])]));
        expect(result.conflicts.filter((c) => c.type === "insufficient_travel_time")).toHaveLength(0);
      });
    });

    describe("overlapping activities", () => {
      it("detects overlap when departure > next arrival", () => {
        const a1 = makePlaceActivity({
          id: "a1",
          title: "Place A",
          schedule: { arrivalTime: "09:00", departureTime: "11:00" },
        });
        const a2 = makePlaceActivity({
          id: "a2",
          title: "Place B",
          schedule: { arrivalTime: "10:30", departureTime: "12:00" },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([a1, a2])]));
        const conflict = result.conflicts.find((c) => c.type === "overlapping_activities");
        expect(conflict).toBeDefined();
        expect(conflict!.severity).toBe("error");
        expect(conflict!.details?.overlapMinutes).toBe(30);
      });

      it("no overlap when activities are sequential", () => {
        const a1 = makePlaceActivity({
          id: "a1",
          schedule: { arrivalTime: "09:00", departureTime: "10:00" },
        });
        const a2 = makePlaceActivity({
          id: "a2",
          schedule: { arrivalTime: "10:00", departureTime: "11:00" },
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([a1, a2])]));
        expect(result.conflicts.filter((c) => c.type === "overlapping_activities")).toHaveLength(0);
      });
    });

    describe("reservation recommended", () => {
      it("flags fine dining venues", () => {
        const activity = makePlaceActivity({
          id: "kaiseki",
          title: "Kikunoi",
          tags: ["kaiseki", "fine_dining"],
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        const conflict = result.conflicts.find((c) => c.type === "reservation_recommended");
        expect(conflict).toBeDefined();
        expect(conflict!.severity).toBe("info");
        expect(conflict!.message).toContain("Fine dining");
      });

      it("flags popular dinner restaurants", () => {
        const activity = makePlaceActivity({
          id: "dinner",
          title: "Popular Restaurant",
          tags: ["restaurant"],
          mealType: "dinner",
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        const conflict = result.conflicts.find((c) => c.type === "reservation_recommended");
        expect(conflict).toBeDefined();
        expect(conflict!.message).toContain("dinner");
      });

      it("flags activities with requires_reservation availability", () => {
        const activity = makePlaceActivity({
          id: "reserved",
          title: "Exclusive Place",
          availabilityStatus: "requires_reservation",
        });
        const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
        const conflict = result.conflicts.find((c) => c.type === "reservation_recommended");
        expect(conflict).toBeDefined();
      });
    });

    describe("summary counts", () => {
      it("counts errors, warnings, and info correctly", () => {
        const activities: ItineraryActivity[] = [
          makePlaceActivity({
            id: "overlap-a",
            title: "A",
            schedule: { arrivalTime: "09:00", departureTime: "11:00" },
          }),
          makePlaceActivity({
            id: "overlap-b",
            title: "B",
            schedule: { arrivalTime: "10:00", departureTime: "12:00" },
            tags: ["fine_dining"],
          }),
        ];
        const result = detectItineraryConflicts(makeItinerary([makeDay(activities)]));
        expect(result.summary.total).toBeGreaterThan(0);
        expect(result.summary.errors).toBeGreaterThanOrEqual(1); // overlap
        expect(result.summary.info).toBeGreaterThanOrEqual(1); // reservation
      });
    });

    it("ignores note activities", () => {
      const note: ItineraryActivity = {
        kind: "note",
        id: "note-1",
        title: "Note",
        timeOfDay: "morning",
        notes: "Remember to bring umbrella",
      };
      const result = detectItineraryConflicts(makeItinerary([makeDay([note])]));
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("getDayConflicts", () => {
    it("returns conflicts for a specific day", () => {
      const activity = makePlaceActivity({
        id: "early",
        schedule: { arrivalTime: "07:00", departureTime: "08:00" },
        operatingWindow: { opensAt: "09:00", closesAt: "17:00" },
      });
      const day = makeDay([activity], { id: "day-1" });
      const result = detectItineraryConflicts(makeItinerary([day]));
      const dayConflicts = getDayConflicts(result, "day-1");
      expect(dayConflicts.length).toBeGreaterThan(0);
    });

    it("returns empty array for day with no conflicts", () => {
      const result = detectItineraryConflicts(makeItinerary([makeDay([])]));
      expect(getDayConflicts(result, "day-1")).toHaveLength(0);
    });

    it("returns empty array for unknown day ID", () => {
      const result = detectItineraryConflicts(makeItinerary([]));
      expect(getDayConflicts(result, "unknown")).toHaveLength(0);
    });
  });

  describe("getActivityConflicts", () => {
    it("returns conflicts for a specific activity", () => {
      const activity = makePlaceActivity({
        id: "my-activity",
        schedule: { arrivalTime: "07:00", departureTime: "08:00" },
        operatingWindow: { opensAt: "09:00", closesAt: "17:00" },
      });
      const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
      const activityConflicts = getActivityConflicts(result, "my-activity");
      expect(activityConflicts.length).toBeGreaterThan(0);
    });

    it("returns empty array for activity without conflicts", () => {
      const activity = makePlaceActivity({ id: "clean" });
      const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
      expect(getActivityConflicts(result, "clean")).toHaveLength(0);
    });
  });

  describe("hasActivityConflicts", () => {
    it("returns true when activity has conflicts", () => {
      const activity = makePlaceActivity({
        id: "bad",
        schedule: { arrivalTime: "07:00", departureTime: "08:00" },
        operatingWindow: { opensAt: "09:00", closesAt: "17:00" },
      });
      const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
      expect(hasActivityConflicts(result, "bad")).toBe(true);
    });

    it("returns false when activity has no conflicts", () => {
      const activity = makePlaceActivity({ id: "good" });
      const result = detectItineraryConflicts(makeItinerary([makeDay([activity])]));
      expect(hasActivityConflicts(result, "good")).toBe(false);
    });
  });
});
