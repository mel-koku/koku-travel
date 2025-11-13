import { describe, expect, it } from "vitest";

import { generateItineraryFromTrip } from "@/lib/itineraryGenerator";
import type { TripBuilderData } from "@/types/trip";

const baseTrip: TripBuilderData = {
  duration: 3,
  dates: {},
  regions: ["kansai"],
  cities: ["kyoto"],
  interests: ["culture", "food", "nature"],
  style: "balanced",
};

describe("generateItineraryFromTrip", () => {
  it("creates one day per requested duration with morning/afternoon/evening slots", () => {
    const itinerary = generateItineraryFromTrip({ ...baseTrip, duration: 4 });

    expect(itinerary.days).toHaveLength(4);
    itinerary.days.forEach((day) => {
      const slots = day.activities.map((activity) => activity.timeOfDay);
      expect(slots).toEqual(["morning", "afternoon", "evening"]);
    });
  });

  it("cycles through interests across a single day", () => {
    const interestsTrip: TripBuilderData = {
      ...baseTrip,
      duration: 1,
      interests: ["food", "culture"],
    };

    const itinerary = generateItineraryFromTrip(interestsTrip);
    const [day] = itinerary.days;
    expect(day.activities).toHaveLength(3);

    const interestRotation = day.activities.map((activity) => activity.tags?.[0]);
    expect(interestRotation).toEqual(["food", "culture", "food"]);
  });
});

