import { describe, it, expect } from "vitest";
import { generateActivityTips } from "../tipGenerator";
import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import type { WeatherForecast } from "@/types/weather";

function makeLocation(overrides: Partial<Location>): Location {
  return {
    id: "test-loc",
    name: "Test Location",
    region: "Kanto",
    city: "Tokyo",
    category: "museum",
    image: "",
    ...overrides,
  } as Location;
}

function makeActivity(
  overrides: Partial<Extract<ItineraryActivity, { kind: "place" }>>,
): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id: "act-1",
    locationId: "test-loc",
    title: "Test",
    timeOfDay: "afternoon",
    durationMin: 90,
    ...overrides,
  } as Extract<ItineraryActivity, { kind: "place" }>;
}

const RAIN_FORECAST: WeatherForecast = {
  date: "2026-06-15",
  condition: "rain",
  temperature: { min: 18, max: 22 },
};

describe("generateActivityTips — rain-proof categories", () => {
  it("treats onsen as rain-proof on a rainy day", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "onsen" }),
      { weatherForecast: RAIN_FORECAST },
    );
    const weatherTip = tips.find((t) => t.type === "weather");
    expect(weatherTip?.title).toBe("Perfect for Rainy Day");
  });

  it("treats aquarium as rain-proof on a rainy day", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "aquarium" }),
      { weatherForecast: RAIN_FORECAST },
    );
    const weatherTip = tips.find((t) => t.type === "weather");
    expect(weatherTip?.title).toBe("Perfect for Rainy Day");
  });

  it("still gives a rain-prep tip for outdoor categories like park", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "park" }),
      { weatherForecast: RAIN_FORECAST },
    );
    const weatherTip = tips.find((t) => t.type === "weather");
    expect(weatherTip?.title).toBe("Rain expected");
  });

  it("treats theater/entertainment as rain-proof", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "theater" }),
      { weatherForecast: RAIN_FORECAST },
    );
    const weatherTip = tips.find((t) => t.type === "weather");
    expect(weatherTip?.title).toBe("Perfect for Rainy Day");
  });
});

describe("generateActivityTips", () => {
  it("should cap total tips at MAX_TOTAL", () => {
    // Use a location that generates many tips
    const location = {
      id: "test-onsen",
      name: "Test Onsen",
      region: "Kansai",
      city: "Kyoto",
      category: "onsen",
      image: "",
      rating: 4.5,
      reviewCount: 100,
      coordinates: { lat: 35.0, lng: 135.7 },
      cashOnly: true,
      reservationInfo: "Required",
      tattooPolicy: "prohibited",
    } as unknown as Parameters<typeof generateActivityTips>[1];

    const activity = {
      kind: "place" as const,
      id: "act-1",
      title: "Test Onsen",
      locationId: "test-onsen",
      category: "onsen",
    } as unknown as Parameters<typeof generateActivityTips>[0];

    const tips = generateActivityTips(activity, location);
    expect(tips.length).toBeLessThanOrEqual(5);
  });
});
