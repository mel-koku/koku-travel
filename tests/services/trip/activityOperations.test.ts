import { describe, it, expect } from "vitest";
import {
  replaceActivity,
  deleteActivity,
  reorderActivities,
  addActivity,
} from "@/services/trip/activityOperations";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";

describe("activityOperations", () => {
  const createMockActivity = (id: string, name: string): ItineraryActivity => ({
    id,
    type: "attraction",
    locationId: `loc-${id}`,
    name,
    duration: 60,
    coordinates: { lat: 35.6762, lng: 139.6503 },
  });

  const createMockItinerary = (activities: ItineraryActivity[]): Itinerary => ({
    days: [
      {
        id: "day-1",
        date: "2026-01-21",
        activities,
      },
      {
        id: "day-2",
        date: "2026-01-22",
        activities: [],
      },
    ],
  });

  describe("replaceActivity", () => {
    it("replaces activity in the correct day", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const activity2 = createMockActivity("act-2", "Activity 2");
      const itinerary = createMockItinerary([activity1, activity2]);

      const newActivity = createMockActivity("act-1-new", "New Activity 1");

      const result = replaceActivity(itinerary, "day-1", "act-1", newActivity);

      expect(result.days[0].activities[0]).toBe(newActivity);
      expect(result.days[0].activities[1]).toBe(activity2);
    });

    it("does not modify other days", () => {
      const activity = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity]);

      const newActivity = createMockActivity("act-new", "New");

      const result = replaceActivity(itinerary, "day-1", "act-1", newActivity);

      expect(result.days[1]).toBe(itinerary.days[1]);
    });

    it("keeps activity unchanged if not found", () => {
      const activity = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity]);

      const newActivity = createMockActivity("act-new", "New");

      const result = replaceActivity(itinerary, "day-1", "non-existent", newActivity);

      expect(result.days[0].activities[0]).toBe(activity);
    });
  });

  describe("deleteActivity", () => {
    it("removes activity from the day", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const activity2 = createMockActivity("act-2", "Activity 2");
      const itinerary = createMockItinerary([activity1, activity2]);

      const result = deleteActivity(itinerary, "day-1", "act-1");

      expect(result.days[0].activities.length).toBe(1);
      expect(result.days[0].activities[0].id).toBe("act-2");
    });

    it("keeps activities unchanged if not found", () => {
      const activity = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity]);

      const result = deleteActivity(itinerary, "day-1", "non-existent");

      expect(result.days[0].activities.length).toBe(1);
    });

    it("does not modify other days", () => {
      const activity = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity]);

      const result = deleteActivity(itinerary, "day-1", "act-1");

      expect(result.days[1]).toBe(itinerary.days[1]);
    });
  });

  describe("reorderActivities", () => {
    it("reorders activities based on provided IDs", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const activity2 = createMockActivity("act-2", "Activity 2");
      const activity3 = createMockActivity("act-3", "Activity 3");
      const itinerary = createMockItinerary([activity1, activity2, activity3]);

      const result = reorderActivities(itinerary, "day-1", ["act-3", "act-1", "act-2"]);

      expect(result.days[0].activities[0].id).toBe("act-3");
      expect(result.days[0].activities[1].id).toBe("act-1");
      expect(result.days[0].activities[2].id).toBe("act-2");
    });

    it("filters out non-existent activity IDs", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const activity2 = createMockActivity("act-2", "Activity 2");
      const itinerary = createMockItinerary([activity1, activity2]);

      const result = reorderActivities(itinerary, "day-1", ["act-1", "non-existent", "act-2"]);

      expect(result.days[0].activities.length).toBe(2);
      expect(result.days[0].activities[0].id).toBe("act-1");
      expect(result.days[0].activities[1].id).toBe("act-2");
    });

    it("does not modify other days", () => {
      const activity = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity]);

      const result = reorderActivities(itinerary, "day-1", ["act-1"]);

      expect(result.days[1]).toBe(itinerary.days[1]);
    });
  });

  describe("addActivity", () => {
    it("adds activity at the end by default", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity1]);

      const newActivity = createMockActivity("act-new", "New Activity");

      const result = addActivity(itinerary, "day-1", newActivity);

      expect(result.days[0].activities.length).toBe(2);
      expect(result.days[0].activities[1]).toBe(newActivity);
    });

    it("adds activity at specified position", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const activity2 = createMockActivity("act-2", "Activity 2");
      const itinerary = createMockItinerary([activity1, activity2]);

      const newActivity = createMockActivity("act-new", "New Activity");

      const result = addActivity(itinerary, "day-1", newActivity, 1);

      expect(result.days[0].activities.length).toBe(3);
      expect(result.days[0].activities[0].id).toBe("act-1");
      expect(result.days[0].activities[1].id).toBe("act-new");
      expect(result.days[0].activities[2].id).toBe("act-2");
    });

    it("adds activity at position 0", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity1]);

      const newActivity = createMockActivity("act-new", "New Activity");

      const result = addActivity(itinerary, "day-1", newActivity, 0);

      expect(result.days[0].activities[0]).toBe(newActivity);
      expect(result.days[0].activities[1]).toBe(activity1);
    });

    it("clamps position to end if out of bounds", () => {
      const activity1 = createMockActivity("act-1", "Activity 1");
      const itinerary = createMockItinerary([activity1]);

      const newActivity = createMockActivity("act-new", "New Activity");

      const result = addActivity(itinerary, "day-1", newActivity, 100);

      expect(result.days[0].activities.length).toBe(2);
      expect(result.days[0].activities[1]).toBe(newActivity);
    });

    it("does not modify other days", () => {
      const itinerary = createMockItinerary([]);
      const newActivity = createMockActivity("act-new", "New Activity");

      const result = addActivity(itinerary, "day-1", newActivity);

      expect(result.days[1]).toBe(itinerary.days[1]);
    });
  });
});
