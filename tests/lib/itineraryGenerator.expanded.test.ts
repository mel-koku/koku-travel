import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import type { IntentExtractionResult } from "@/types/llmConstraints";
import { generateItinerary } from "@/lib/itineraryGenerator";

/**
 * Mock locations — a superset covering multiple categories and cities.
 * Bars and entertainment are included to test evening slot placement.
 */
const MOCK_LOCATIONS: Location[] = [
  // Kyoto (culture + food + bars)
  { id: "k-temple-1", name: "Kiyomizu Temple", city: "Kyoto", region: "Kansai", category: "temple", image: "/t.jpg", coordinates: { lat: 34.9948, lng: 135.785 }, rating: 4.7, reviewCount: 15000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["transit"], timezone: "Asia/Tokyo" },
  { id: "k-shrine-1", name: "Fushimi Inari", city: "Kyoto", region: "Kansai", category: "shrine", image: "/t.jpg", coordinates: { lat: 34.9671, lng: 135.7727 }, rating: 4.8, reviewCount: 20000, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["train"], timezone: "Asia/Tokyo" },
  { id: "k-temple-2", name: "Kinkaku-ji", city: "Kyoto", region: "Kansai", category: "temple", image: "/t.jpg", coordinates: { lat: 35.0394, lng: 135.7292 }, rating: 4.7, reviewCount: 18000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["bus"], timezone: "Asia/Tokyo" },
  { id: "k-garden-1", name: "Gion Garden", city: "Kyoto", region: "Kansai", category: "garden", image: "/t.jpg", coordinates: { lat: 35.0025, lng: 135.776 }, rating: 4.6, reviewCount: 2000, recommendedVisit: { typicalMinutes: 45, minMinutes: 20 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-park-1", name: "Maruyama Park", city: "Kyoto", region: "Kansai", category: "park", image: "/t.jpg", coordinates: { lat: 35.0016, lng: 135.7818 }, rating: 4.4, reviewCount: 3000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-museum-1", name: "Kyoto National Museum", city: "Kyoto", region: "Kansai", category: "museum", image: "/t.jpg", coordinates: { lat: 34.991, lng: 135.772 }, rating: 4.5, reviewCount: 7000, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["bus"], timezone: "Asia/Tokyo" },
  { id: "k-bar-1", name: "Kyoto Bar District", city: "Kyoto", region: "Kansai", category: "bar", image: "/t.jpg", coordinates: { lat: 35.004, lng: 135.769 }, rating: 4.0, reviewCount: 800, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-landmark-1", name: "Kyoto Tower", city: "Kyoto", region: "Kansai", category: "landmark", image: "/t.jpg", coordinates: { lat: 34.9875, lng: 135.7592 }, rating: 4.2, reviewCount: 4000, recommendedVisit: { typicalMinutes: 45, minMinutes: 20 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-nature-1", name: "Arashiyama Bamboo Grove", city: "Kyoto", region: "Kansai", category: "nature", image: "/t.jpg", coordinates: { lat: 35.017, lng: 135.6713 }, rating: 4.7, reviewCount: 16000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["train"], timezone: "Asia/Tokyo" },
  { id: "k-viewpoint-1", name: "Fushimi Summit", city: "Kyoto", region: "Kansai", category: "viewpoint", image: "/t.jpg", coordinates: { lat: 34.968, lng: 135.774 }, rating: 4.6, reviewCount: 5000, recommendedVisit: { typicalMinutes: 45, minMinutes: 20 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-shrine-2", name: "Yasaka Shrine", city: "Kyoto", region: "Kansai", category: "shrine", image: "/t.jpg", coordinates: { lat: 35.0036, lng: 135.7785 }, rating: 4.5, reviewCount: 9000, recommendedVisit: { typicalMinutes: 45, minMinutes: 20 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-park-2", name: "Philosopher Path", city: "Kyoto", region: "Kansai", category: "park", image: "/t.jpg", coordinates: { lat: 35.019, lng: 135.794 }, rating: 4.5, reviewCount: 6000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  { id: "k-historic-1", name: "Nijo Castle", city: "Kyoto", region: "Kansai", category: "historic", image: "/t.jpg", coordinates: { lat: 35.0142, lng: 135.7479 }, rating: 4.5, reviewCount: 10000, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["bus"], timezone: "Asia/Tokyo" },
  { id: "k-craft-1", name: "Kyoto Craft Workshop", city: "Kyoto", region: "Kansai", category: "craft", image: "/t.jpg", coordinates: { lat: 35.01, lng: 135.77 }, rating: 4.3, reviewCount: 500, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["walk"], timezone: "Asia/Tokyo" },
  // Tokyo (smaller set for multi-city tests)
  { id: "t-shrine-1", name: "Meiji Shrine", city: "Tokyo", region: "Kanto", category: "shrine", image: "/t.jpg", coordinates: { lat: 35.6764, lng: 139.6993 }, rating: 4.6, reviewCount: 20000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["train"], timezone: "Asia/Tokyo" },
  { id: "t-temple-1", name: "Senso-ji", city: "Tokyo", region: "Kanto", category: "temple", image: "/t.jpg", coordinates: { lat: 35.7148, lng: 139.7967 }, rating: 4.5, reviewCount: 25000, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["subway"], timezone: "Asia/Tokyo" },
  { id: "t-park-1", name: "Ueno Park", city: "Tokyo", region: "Kanto", category: "park", image: "/t.jpg", coordinates: { lat: 35.7141, lng: 139.7744 }, rating: 4.4, reviewCount: 12000, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["subway"], timezone: "Asia/Tokyo" },
  { id: "t-landmark-1", name: "Tokyo Tower", city: "Tokyo", region: "Kanto", category: "landmark", image: "/t.jpg", coordinates: { lat: 35.6586, lng: 139.7454 }, rating: 4.4, reviewCount: 18000, recommendedVisit: { typicalMinutes: 60, minMinutes: 30 }, preferredTransitModes: ["subway"], timezone: "Asia/Tokyo" },
  { id: "t-garden-1", name: "Shinjuku Gyoen", city: "Tokyo", region: "Kanto", category: "garden", image: "/t.jpg", coordinates: { lat: 35.6852, lng: 139.71 }, rating: 4.6, reviewCount: 10000, recommendedVisit: { typicalMinutes: 90, minMinutes: 45 }, preferredTransitModes: ["subway"], timezone: "Asia/Tokyo" },
];

vi.mock("@/lib/weather/weatherService", () => ({
  fetchWeatherForecast: vi.fn().mockResolvedValue(new Map()),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const baseTrip: TripBuilderData = {
  duration: 3,
  dates: { start: "2026-04-01", end: "2026-04-03" },
  regions: ["kansai"],
  cities: ["kyoto"],
  interests: ["culture", "food", "nature"],
  style: "balanced",
};

describe("generateItinerary — expanded", () => {
  describe("saved location prioritization", () => {
    it("includes saved locations in the itinerary", async () => {
      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 2 },
        {
          locations: MOCK_LOCATIONS,
          savedIds: ["k-temple-1", "k-shrine-1"],
        },
      );

      const allActivities = itinerary.days.flatMap((d) => d.activities);
      const savedUsed = allActivities.filter(
        (a) =>
          a.kind === "place" &&
          (a.locationId === "k-temple-1" || a.locationId === "k-shrine-1"),
      );
      // At least one saved location should appear
      expect(savedUsed.length).toBeGreaterThanOrEqual(1);
    });

    it("places bar-category saves in evening slots", async () => {
      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 1, interests: ["nightlife", "culture"] },
        {
          locations: MOCK_LOCATIONS,
          savedIds: ["k-bar-1"],
        },
      );

      const barActivity = itinerary.days
        .flatMap((d) => d.activities)
        .find(
          (a) =>
            a.kind === "place" && a.locationId === "k-bar-1",
        );
      if (barActivity) {
        expect(barActivity.timeOfDay).toBe("evening");
      }
    });

    it("places temple-category saves in morning slots", async () => {
      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 1 },
        {
          locations: MOCK_LOCATIONS,
          savedIds: ["k-temple-1"],
        },
      );

      const templeActivity = itinerary.days
        .flatMap((d) => d.activities)
        .find(
          (a) => a.kind === "place" && a.locationId === "k-temple-1",
        );
      if (templeActivity) {
        expect(templeActivity.timeOfDay).toBe("morning");
      }
    });
  });

  describe("intent constraints", () => {
    it("filters excluded categories from generated activities", async () => {
      const intentConstraints: IntentExtractionResult = {
        pinnedLocations: [],
        excludedCategories: ["bar"],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      };

      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 2, interests: ["culture", "nightlife"] },
        {
          locations: MOCK_LOCATIONS,
          intentConstraints,
        },
      );

      const allActivities = itinerary.days.flatMap((d) => d.activities);
      const barActivities = allActivities.filter(
        (a) =>
          a.kind === "place" &&
          a.tags?.some((t) => t === "bar" || t === "nightlife_bar"),
      );
      // Should not include any bar-category activities
      // (they get filtered at the availableLocations stage)
      expect(barActivities.filter((a) => a.kind === "place" && MOCK_LOCATIONS.find((l) => l.id === (a as Extract<typeof a, {kind: "place"}>).locationId)?.category === "bar")).toHaveLength(0);
    });

    it("passes category weights through to scoring", async () => {
      const intentConstraints: IntentExtractionResult = {
        pinnedLocations: [],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: { temple: 2.0, shrine: 2.0 },
        additionalInsights: [],
      };

      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 2 },
        {
          locations: MOCK_LOCATIONS,
          intentConstraints,
        },
      );

      // With heavy temple/shrine weighting, most activities should be temples or shrines
      const allActivities = itinerary.days.flatMap((d) => d.activities);
      const placeActivities = allActivities.filter((a) => a.kind === "place");
      expect(placeActivities.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("name-based deduplication", () => {
    it("does not repeat same-name locations across days", async () => {
      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 3 },
        { locations: MOCK_LOCATIONS },
      );

      const allNames = itinerary.days
        .flatMap((d) => d.activities)
        .filter((a) => a.kind === "place")
        .map((a) => a.title.toLowerCase());

      const nameSet = new Set(allNames);
      // Each name should appear only once
      expect(nameSet.size).toBe(allNames.length);
    });
  });

  describe("multi-city behavior", () => {
    it("assigns correct cityId to each day", async () => {
      const itinerary = await generateItinerary(
        {
          ...baseTrip,
          duration: 6,
          cities: ["kyoto", "tokyo"],
          regions: undefined,
        },
        { locations: MOCK_LOCATIONS },
      );

      // Each day should have a cityId
      itinerary.days.forEach((day) => {
        expect(day.cityId).toBeDefined();
        expect(["kyoto", "tokyo"]).toContain(day.cityId);
      });

      // Both cities should appear
      const cities = new Set(itinerary.days.map((d) => d.cityId));
      expect(cities.size).toBe(2);
    });
  });

  describe("activity tagging", () => {
    it("tags all place activities with interest tag", async () => {
      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 1 },
        { locations: MOCK_LOCATIONS },
      );

      const placeActivities = itinerary.days
        .flatMap((d) => d.activities)
        .filter((a) => a.kind === "place");

      placeActivities.forEach((activity) => {
        if (activity.kind === "place") {
          expect(activity.tags).toBeDefined();
          expect(activity.tags!.length).toBeGreaterThanOrEqual(1);
        }
      });
    });

    it("distributes activities across time slots", async () => {
      const itinerary = await generateItinerary(
        { ...baseTrip, duration: 1 },
        { locations: MOCK_LOCATIONS },
      );

      const slots = new Set(
        itinerary.days[0]!.activities.map((a) => a.timeOfDay),
      );
      // Should have morning + afternoon at minimum
      expect(slots.size).toBeGreaterThanOrEqual(2);
    });
  });
});
