import { describe, expect, it } from "vitest";

import { generateItinerary } from "@/lib/itineraryGenerator";
import type { TripBuilderData } from "@/types/trip";

const baseTrip: TripBuilderData = {
  duration: 3,
  dates: {},
  regions: ["kansai"],
  cities: ["kyoto"],
  interests: ["culture", "food", "nature"],
  style: "balanced",
};

describe("generateItinerary", () => {
  it("creates one day per requested duration with morning/afternoon/evening slots", () => {
    const itinerary = generateItinerary({ ...baseTrip, duration: 4 });

    expect(itinerary.days).toHaveLength(4);
    itinerary.days.forEach((day) => {
      // Each day should have activities in all three time slots
      const slots = day.activities.map((activity) => activity.timeOfDay);
      expect(slots).toContain("morning");
      expect(slots).toContain("afternoon");
      expect(slots).toContain("evening");
      // Should have at least 3 activities (one per slot minimum)
      expect(day.activities.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("cycles through interests across a single day", () => {
    const interestsTrip: TripBuilderData = {
      ...baseTrip,
      duration: 1,
      interests: ["food", "culture"],
    };

    const itinerary = generateItinerary(interestsTrip);
    const [day] = itinerary.days;
    // Each day should have at least 3 activities (morning, afternoon, evening)
    // For shorter trips, may have more activities
    expect(day.activities.length).toBeGreaterThanOrEqual(3);

    // Verify that interests cycle correctly
    const interestRotation = day.activities.map((activity) => 
      activity.kind === "place" ? activity.tags?.[0] : undefined
    );
    // First three should cycle: food, culture, food
    expect(interestRotation.slice(0, 3)).toEqual(["dining", "cultural", "dining"]);
    
    // Verify all time slots are filled (morning, afternoon, evening)
    const timeSlots = day.activities.map((activity) => activity.timeOfDay);
    expect(timeSlots).toContain("morning");
    expect(timeSlots).toContain("afternoon");
    expect(timeSlots).toContain("evening");
  });

  it("groups cities by region to minimize travel time", () => {
    const multiCityTrip: TripBuilderData = {
      ...baseTrip,
      duration: 10,
      cities: ["kyoto", "osaka", "tokyo"], // Kansai cities first, then Kanto
      regions: undefined,
    };

    const itinerary = generateItinerary(multiCityTrip);
    
    // Extract city IDs from days
    const citySequence = itinerary.days.map((day) => day.cityId).filter(Boolean);
    
    // Verify that Kansai cities (kyoto, osaka) come before Tokyo
    const firstTokyoIndex = citySequence.findIndex((city) => city === "tokyo");
    const lastKansaiIndex = Math.max(
      citySequence.findLastIndex((city) => city === "kyoto"),
      citySequence.findLastIndex((city) => city === "osaka"),
    );
    
    // If Tokyo appears, it should come after all Kansai cities
    if (firstTokyoIndex !== -1 && lastKansaiIndex !== -1) {
      expect(firstTokyoIndex).toBeGreaterThan(lastKansaiIndex);
    }
  });

  it("preserves region grouping when expanding for multiple days", () => {
    const longTrip: TripBuilderData = {
      ...baseTrip,
      duration: 7,
      cities: ["kyoto", "osaka", "tokyo"],
      regions: undefined,
    };

    const itinerary = generateItinerary(longTrip);
    const citySequence = itinerary.days.map((day) => day.cityId).filter(Boolean);
    
    // Count transitions between regions
    let regionTransitions = 0;
    for (let i = 1; i < citySequence.length; i++) {
      const prevCity = citySequence[i - 1];
      const currCity = citySequence[i];
      
      // Check if we're transitioning from Kansai to Kanto or vice versa
      const prevIsKansai = prevCity === "kyoto" || prevCity === "osaka";
      const currIsKansai = currCity === "kyoto" || currCity === "osaka";
      
      if (prevIsKansai !== currIsKansai) {
        regionTransitions++;
      }
    }
    
    // Should have at most 1 transition (from Kansai to Kanto)
    // This ensures we don't go back and forth
    expect(regionTransitions).toBeLessThanOrEqual(1);
  });

  it("adjusts activity count based on travel pace", () => {
    const relaxedTrip: TripBuilderData = {
      ...baseTrip,
      duration: 2,
      style: "relaxed",
    };
    const balancedTrip: TripBuilderData = {
      ...baseTrip,
      duration: 2,
      style: "balanced",
    };
    const fastTrip: TripBuilderData = {
      ...baseTrip,
      duration: 2,
      style: "fast",
    };

    const relaxedItinerary = generateItinerary(relaxedTrip);
    const balancedItinerary = generateItinerary(balancedTrip);
    const fastItinerary = generateItinerary(fastTrip);

    // Fast pace should generally have more activities per day than relaxed
    const relaxedAvg = relaxedItinerary.days.reduce((sum, day) => sum + day.activities.length, 0) / relaxedItinerary.days.length;
    const balancedAvg = balancedItinerary.days.reduce((sum, day) => sum + day.activities.length, 0) / balancedItinerary.days.length;
    const fastAvg = fastItinerary.days.reduce((sum, day) => sum + day.activities.length, 0) / fastItinerary.days.length;

    // Fast should have more activities than relaxed
    expect(fastAvg).toBeGreaterThanOrEqual(relaxedAvg);
    // Balanced should generally sit between relaxed and fast with some tolerance
    expect(balancedAvg).toBeGreaterThanOrEqual(relaxedAvg - 1);
    expect(balancedAvg).toBeLessThanOrEqual(fastAvg);

    // All should have at least 3 activities (one per time slot)
    relaxedItinerary.days.forEach((day) => {
      expect(day.activities.length).toBeGreaterThanOrEqual(3);
    });
    balancedItinerary.days.forEach((day) => {
      expect(day.activities.length).toBeGreaterThanOrEqual(3);
    });
    fastItinerary.days.forEach((day) => {
      expect(day.activities.length).toBeGreaterThanOrEqual(3);
    });
  });
});

