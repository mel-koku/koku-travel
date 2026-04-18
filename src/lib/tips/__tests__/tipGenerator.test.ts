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

describe("generateActivityTips — last-train trigger (B1)", () => {
  it("fires last-train tip for evening bar with city context", () => {
    const tips = generateActivityTips(
      makeActivity({ timeOfDay: "evening" }),
      makeLocation({ category: "bar" }),
      { cityId: "tokyo" },
    );
    const timingTip = tips.find((t) => t.title.toLowerCase().includes("last train"));
    expect(timingTip).toBeDefined();
    expect(timingTip?.message).toMatch(/Tokyo|Shinjuku|midnight|around 12/i);
  });

  it("fires last-train tip for evening izakaya", () => {
    const tips = generateActivityTips(
      makeActivity({ timeOfDay: "evening" }),
      makeLocation({ category: "izakaya" }),
      { cityId: "osaka" },
    );
    const timingTip = tips.find((t) => t.title.toLowerCase().includes("last train"));
    expect(timingTip).toBeDefined();
  });

  it("does NOT fire last-train tip for afternoon bar (not evening)", () => {
    const tips = generateActivityTips(
      makeActivity({ timeOfDay: "afternoon" }),
      makeLocation({ category: "bar" }),
      { cityId: "tokyo" },
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("last train"))).toBeUndefined();
  });

  it("does NOT fire last-train tip for evening restaurant (not nightlife)", () => {
    const tips = generateActivityTips(
      makeActivity({ timeOfDay: "evening" }),
      makeLocation({ category: "restaurant" }),
      { cityId: "tokyo" },
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("last train"))).toBeUndefined();
  });

  it("does NOT fire last-train tip when no cityId provided", () => {
    const tips = generateActivityTips(
      makeActivity({ timeOfDay: "evening" }),
      makeLocation({ category: "bar" }),
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("last train"))).toBeUndefined();
  });
});

describe("generateActivityTips — reservation lead-time tiers (B2)", () => {
  it("says 1-3 months ahead for omakase at top-rated venues", () => {
    const tips = generateActivityTips(
      makeActivity({ mealType: "dinner" }),
      makeLocation({ category: "omakase", rating: 4.8 }),
    );
    const res = tips.find((t) => t.type === "reservation");
    expect(res).toBeDefined();
    expect(res?.message).toMatch(/1-3 months|months? ahead/i);
  });

  it("says 1-3 months ahead for kaiseki at top-rated venues", () => {
    const tips = generateActivityTips(
      makeActivity({ mealType: "dinner" }),
      makeLocation({ category: "kaiseki", rating: 4.8 }),
    );
    const res = tips.find((t) => t.type === "reservation");
    expect(res?.message).toMatch(/1-3 months|months? ahead/i);
  });

  it("says 2-4 weeks for fine dining (not top-rated)", () => {
    const tips = generateActivityTips(
      makeActivity({ mealType: "dinner" }),
      makeLocation({ category: "fine_dining", rating: 4.5 }),
    );
    const res = tips.find((t) => t.type === "reservation");
    expect(res?.message).toMatch(/weeks? ahead|2-4 weeks/i);
  });

  it("keeps the generic copy for merely popular restaurants (4.7+)", () => {
    const tips = generateActivityTips(
      makeActivity({ mealType: "dinner" }),
      makeLocation({ category: "restaurant", rating: 4.7 }),
    );
    const res = tips.find((t) => t.type === "reservation");
    expect(res).toBeDefined();
    // Should NOT use the months-ahead copy for a generic 4.7 restaurant
    expect(res?.message).not.toMatch(/months? ahead/i);
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
