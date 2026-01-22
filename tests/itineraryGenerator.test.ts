import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import { generateItinerary } from "@/lib/itineraryGenerator";

// Static mock locations data - defined directly in the test file
const MOCK_LOCATIONS: Location[] = [
  // Kyoto locations (10)
  { id: "kyoto-temple-1", name: "Kiyomizu Temple", city: "Kyoto", region: "Kansai", category: "temple", image: "/test.jpg", coordinates: { lat: 34.9948, lng: 135.7850 }, rating: 4.7, review_count: 15000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["transit", "walk"], timezone: "Asia/Tokyo" },
  { id: "kyoto-shrine-1", name: "Fushimi Inari", city: "Kyoto", region: "Kansai", category: "shrine", image: "/test.jpg", coordinates: { lat: 34.9671, lng: 135.7727 }, rating: 4.8, review_count: 20000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["train", "bus"], timezone: "Asia/Tokyo" },
  { id: "kyoto-restaurant-1", name: "Kyoto Ramen Shop", city: "Kyoto", region: "Kansai", category: "restaurant", image: "/test.jpg", coordinates: { lat: 35.0050, lng: 135.7648 }, rating: 4.3, review_count: 500, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "kyoto-market-1", name: "Nishiki Market", city: "Kyoto", region: "Kansai", category: "market", image: "/test.jpg", coordinates: { lat: 35.0050, lng: 135.7648 }, rating: 4.5, review_count: 8000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["walk", "bus"], timezone: "Asia/Tokyo" },
  { id: "kyoto-park-1", name: "Maruyama Park", city: "Kyoto", region: "Kansai", category: "park", image: "/test.jpg", coordinates: { lat: 35.0016, lng: 135.7818 }, rating: 4.4, review_count: 3000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "kyoto-garden-1", name: "Gion Garden", city: "Kyoto", region: "Kansai", category: "garden", image: "/test.jpg", coordinates: { lat: 35.0025, lng: 135.7760 }, rating: 4.6, review_count: 2000, recommended_visit: { typicalMinutes: 45, minMinutes: 20 }, preferred_transit_modes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "kyoto-historic-1", name: "Nijo Castle", city: "Kyoto", region: "Kansai", category: "historic", image: "/test.jpg", coordinates: { lat: 35.0142, lng: 135.7479 }, rating: 4.5, review_count: 10000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["bus", "subway"], timezone: "Asia/Tokyo" },
  { id: "kyoto-temple-2", name: "Kinkaku-ji", city: "Kyoto", region: "Kansai", category: "temple", image: "/test.jpg", coordinates: { lat: 35.0394, lng: 135.7292 }, rating: 4.7, review_count: 18000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["bus"], timezone: "Asia/Tokyo" },
  { id: "kyoto-temple-3", name: "Ryoan-ji", city: "Kyoto", region: "Kansai", category: "temple", image: "/test.jpg", coordinates: { lat: 35.0345, lng: 135.7184 }, rating: 4.4, review_count: 6000, recommended_visit: { typicalMinutes: 45, minMinutes: 20 }, preferred_transit_modes: ["bus"], timezone: "Asia/Tokyo" },
  { id: "kyoto-restaurant-2", name: "Kyoto Sushi", city: "Kyoto", region: "Kansai", category: "restaurant", image: "/test.jpg", coordinates: { lat: 35.0086, lng: 135.7681 }, rating: 4.2, review_count: 300, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["walk"], timezone: "Asia/Tokyo" },
  // Osaka locations (5)
  { id: "osaka-restaurant-1", name: "Dotonbori Food", city: "Osaka", region: "Kansai", category: "restaurant", image: "/test.jpg", coordinates: { lat: 34.6687, lng: 135.5018 }, rating: 4.3, review_count: 5000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "osaka-landmark-1", name: "Osaka Castle", city: "Osaka", region: "Kansai", category: "landmark", image: "/test.jpg", coordinates: { lat: 34.6873, lng: 135.5262 }, rating: 4.6, review_count: 15000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["subway", "train"], timezone: "Asia/Tokyo" },
  { id: "osaka-market-1", name: "Kuromon Market", city: "Osaka", region: "Kansai", category: "market", image: "/test.jpg", coordinates: { lat: 34.6666, lng: 135.5063 }, rating: 4.4, review_count: 4000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["subway", "walk"], timezone: "Asia/Tokyo" },
  { id: "osaka-park-1", name: "Osaka Park", city: "Osaka", region: "Kansai", category: "park", image: "/test.jpg", coordinates: { lat: 34.6851, lng: 135.5306 }, rating: 4.3, review_count: 2000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["subway"], timezone: "Asia/Tokyo" },
  { id: "osaka-shrine-1", name: "Sumiyoshi Taisha", city: "Osaka", region: "Kansai", category: "shrine", image: "/test.jpg", coordinates: { lat: 34.6128, lng: 135.4926 }, rating: 4.5, review_count: 3000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["train"], timezone: "Asia/Tokyo" },
  // Tokyo locations (7)
  { id: "tokyo-shrine-1", name: "Meiji Shrine", city: "Tokyo", region: "Kanto", category: "shrine", image: "/test.jpg", coordinates: { lat: 35.6764, lng: 139.6993 }, rating: 4.6, review_count: 20000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["train", "walk"], timezone: "Asia/Tokyo" },
  { id: "tokyo-temple-1", name: "Senso-ji", city: "Tokyo", region: "Kanto", category: "temple", image: "/test.jpg", coordinates: { lat: 35.7148, lng: 139.7967 }, rating: 4.5, review_count: 25000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["subway"], timezone: "Asia/Tokyo" },
  { id: "tokyo-landmark-1", name: "Tokyo Tower", city: "Tokyo", region: "Kanto", category: "landmark", image: "/test.jpg", coordinates: { lat: 35.6586, lng: 139.7454 }, rating: 4.4, review_count: 18000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["subway", "bus"], timezone: "Asia/Tokyo" },
  { id: "tokyo-park-1", name: "Ueno Park", city: "Tokyo", region: "Kanto", category: "park", image: "/test.jpg", coordinates: { lat: 35.7141, lng: 139.7744 }, rating: 4.4, review_count: 12000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["subway", "train"], timezone: "Asia/Tokyo" },
  { id: "tokyo-restaurant-1", name: "Tokyo Ramen", city: "Tokyo", region: "Kanto", category: "restaurant", image: "/test.jpg", coordinates: { lat: 35.6896, lng: 139.7006 }, rating: 4.2, review_count: 1000, recommended_visit: { typicalMinutes: 60, minMinutes: 30 }, preferred_transit_modes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "tokyo-market-1", name: "Tsukiji Market", city: "Tokyo", region: "Kanto", category: "market", image: "/test.jpg", coordinates: { lat: 35.6654, lng: 139.7707 }, rating: 4.5, review_count: 15000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["subway"], timezone: "Asia/Tokyo" },
  { id: "tokyo-garden-1", name: "Shinjuku Gyoen", city: "Tokyo", region: "Kanto", category: "garden", image: "/test.jpg", coordinates: { lat: 35.6852, lng: 139.7100 }, rating: 4.6, review_count: 10000, recommended_visit: { typicalMinutes: 90, minMinutes: 45 }, preferred_transit_modes: ["subway", "train"], timezone: "Asia/Tokyo" },
];

// Mock weather service to avoid network calls
vi.mock("@/lib/weather/weatherService", () => ({
  fetchWeatherForecast: vi.fn().mockResolvedValue(new Map()),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const baseTrip: TripBuilderData = {
  duration: 3,
  dates: {},
  regions: ["kansai"],
  cities: ["kyoto"],
  interests: ["culture", "food", "nature"],
  style: "balanced",
};

// Tests use the locations option to bypass Supabase and provide mock data directly
describe("generateItinerary", () => {
  it("creates one day per requested duration with morning/afternoon/evening slots", async () => {
    const itinerary = await generateItinerary({ ...baseTrip, duration: 4 }, { locations: MOCK_LOCATIONS });

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

  it("cycles through interests across a single day", async () => {
    const interestsTrip: TripBuilderData = {
      ...baseTrip,
      duration: 1,
      interests: ["food", "culture"],
    };

    const itinerary = await generateItinerary(interestsTrip, { locations: MOCK_LOCATIONS });
    const [day] = itinerary.days;
    // Each day should have at least 3 activities (morning, afternoon, evening)
    // For shorter trips, may have more activities
    expect(day.activities.length).toBeGreaterThanOrEqual(3);

    // Verify that interests cycle correctly
    const interestRotation = day.activities.map((activity) =>
      activity.kind === "place" ? activity.tags?.[0] : undefined
    ).filter(Boolean);

    // Should have both "dining" and "cultural" tags in the first few activities
    // (exact order may vary based on location availability)
    const firstThreeTags = interestRotation.slice(0, 3);
    expect(firstThreeTags.length).toBeGreaterThanOrEqual(2);
    expect(firstThreeTags).toContain("dining");
    expect(firstThreeTags).toContain("cultural");

    // Verify all time slots are filled (morning, afternoon, evening)
    const timeSlots = day.activities.map((activity) => activity.timeOfDay);
    expect(timeSlots).toContain("morning");
    expect(timeSlots).toContain("afternoon");
    expect(timeSlots).toContain("evening");
  });

  it("groups cities by region to minimize travel time", async () => {
    const multiCityTrip: TripBuilderData = {
      ...baseTrip,
      duration: 10,
      cities: ["kyoto", "osaka", "tokyo"], // Kansai cities first, then Kanto
      regions: undefined,
    };

    const itinerary = await generateItinerary(multiCityTrip, { locations: MOCK_LOCATIONS });

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

  it("preserves region grouping when expanding for multiple days", async () => {
    const longTrip: TripBuilderData = {
      ...baseTrip,
      duration: 7,
      cities: ["kyoto", "osaka", "tokyo"],
      regions: undefined,
    };

    const itinerary = await generateItinerary(longTrip, { locations: MOCK_LOCATIONS });
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

  it("adjusts activity count based on travel pace", async () => {
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

    const relaxedItinerary = await generateItinerary(relaxedTrip, { locations: MOCK_LOCATIONS });
    const balancedItinerary = await generateItinerary(balancedTrip, { locations: MOCK_LOCATIONS });
    const fastItinerary = await generateItinerary(fastTrip, { locations: MOCK_LOCATIONS });

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
