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

describe("generateActivityTips — holiday-aware crowd tip (C13)", () => {
  it("upgrades crowd tip on Golden Week at a known-crowded location", () => {
    // Golden Week is Apr 29 – May 5. Fushimi Inari has a peakWarning override.
    const goldenWeekDay = new Date(2026, 4, 1); // May 1, 2026
    const tips = generateActivityTips(
      makeActivity({ id: "a1", locationId: "fushimi-inari", timeOfDay: "morning" }),
      makeLocation({ id: "fushimi-inari", category: "shrine", rating: 4.8 }),
      { activityDate: goldenWeekDay },
    );
    const crowdTip = tips.find((t) => t.title.toLowerCase().includes("holiday") || /golden week/i.test(t.message));
    expect(crowdTip).toBeDefined();
    expect(crowdTip?.isImportant).toBe(true);
    expect(crowdTip?.message).toMatch(/Golden Week/i);
  });

  it("does NOT upgrade crowd tip on a non-holiday date", () => {
    const regularDay = new Date(2026, 5, 15); // June 15, 2026 — no holiday
    const tips = generateActivityTips(
      makeActivity({ id: "a1", locationId: "fushimi-inari", timeOfDay: "morning" }),
      makeLocation({ id: "fushimi-inari", category: "shrine", rating: 4.8 }),
      { activityDate: regularDay },
    );
    expect(tips.find((t) => /Golden Week|Obon|New Year/i.test(t.message))).toBeUndefined();
  });

  it("does NOT upgrade for a location without a CROWD_OVERRIDES entry", () => {
    const goldenWeekDay = new Date(2026, 4, 1);
    const tips = generateActivityTips(
      makeActivity({ id: "a1", locationId: "some-random-loc", timeOfDay: "morning" }),
      makeLocation({ id: "some-random-loc", category: "shrine", rating: 4.8 }),
      { activityDate: goldenWeekDay },
    );
    // Regular crowd tip may fire, but not the escalated holiday+override one.
    expect(tips.find((t) => t.isImportant && /Golden Week/i.test(t.message))).toBeUndefined();
  });
});

describe("generateActivityTips — shoe-removal narrowing (A4)", () => {
  it("does NOT fire shoe-removal tip on a regular restaurant", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "restaurant" }),
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("shoe"))).toBeUndefined();
  });

  it("does NOT fire shoe-removal tip on a cafe", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "cafe" }),
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("shoe"))).toBeUndefined();
  });

  it("fires shoe-removal tip for a kaiseki restaurant", () => {
    const tips = generateActivityTips(
      makeActivity({ mealType: "dinner" }),
      makeLocation({ category: "kaiseki" }),
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("shoe"))).toBeDefined();
  });

  it("fires shoe-removal tip when tags include traditional", () => {
    const tips = generateActivityTips(
      makeActivity({ tags: ["traditional"] }),
      makeLocation({ category: "restaurant", tags: ["traditional"] }),
    );
    expect(tips.find((t) => t.title.toLowerCase().includes("shoe"))).toBeDefined();
  });
});

describe("generateActivityTips — Popular Destination noise reduction (A7)", () => {
  it("does NOT fire generic 'Popular Destination' when location has a crowd override (peakWarning is better)", () => {
    const tips = generateActivityTips(
      makeActivity({ id: "a1", locationId: "fushimi-inari" }),
      makeLocation({ id: "fushimi-inari", category: "shrine", rating: 4.8 }),
    );
    const popular = tips.find((t) => t.title === "Popular Destination");
    expect(popular).toBeUndefined();
  });

  it("does NOT fire 'Popular Destination' at the old 4.5 threshold — only 4.7+", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ id: "random-4-5", category: "museum", rating: 4.5 }),
    );
    const popular = tips.find((t) => t.title === "Popular Destination");
    expect(popular).toBeUndefined();
  });

  it("still fires 'Popular Destination' for 4.7+ without a crowd override", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ id: "random-4-8", category: "museum", rating: 4.8 }),
    );
    const popular = tips.find((t) => t.title === "Popular Destination");
    expect(popular).toBeDefined();
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

describe("generateActivityTips — wind tier (C12)", () => {
  const CLEAR_BASE: WeatherForecast = {
    date: "2026-09-20",
    condition: "clear",
    temperature: { min: 20, max: 24 },
  };

  it("fires no wind tip when windSpeed is undefined (mock-weather mode)", () => {
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "viewpoint" }),
      { weatherForecast: CLEAR_BASE },
    );
    const windTip = tips.find((t) =>
      ["Breezy conditions", "Strong winds", "Gale-force winds"].includes(t.title),
    );
    expect(windTip).toBeUndefined();
  });

  it("fires breezy tip only for wind-sensitive categories at 7 m/s", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 8 };

    const sensitiveTips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "viewpoint" }),
      { weatherForecast: forecast },
    );
    expect(sensitiveTips.find((t) => t.title === "Breezy conditions")).toBeDefined();

    const insensitiveTips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "museum" }),
      { weatherForecast: forecast },
    );
    expect(insensitiveTips.find((t) => t.title === "Breezy conditions")).toBeUndefined();
  });

  it("fires strong winds at 12 m/s regardless of category, with activity-aware copy", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 13 };

    const sensitive = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "viewpoint" }),
      { weatherForecast: forecast },
    );
    const sensitiveTip = sensitive.find((t) => t.title === "Strong winds");
    expect(sensitiveTip).toBeDefined();
    expect(sensitiveTip?.message).toMatch(/cable cars|ropeways|ferry/i);

    const generic = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "museum" }),
      { weatherForecast: forecast },
    );
    const genericTip = generic.find((t) => t.title === "Strong winds");
    expect(genericTip).toBeDefined();
    expect(genericTip?.message).toMatch(/hats|camera straps|blustery/i);
  });

  it("fires gale-force tip with isImportant at 17 m/s", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 18 };
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "museum" }),
      { weatherForecast: forecast },
    );
    const galeTip = tips.find((t) => t.title === "Gale-force winds");
    expect(galeTip).toBeDefined();
    expect(galeTip?.isImportant).toBe(true);
    expect(galeTip?.message).toMatch(/typhoon|August through October/i);
  });

  it("uses activity-aware gale copy for wind-sensitive locations", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 20 };
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "tower" }),
      { weatherForecast: forecast },
    );
    const galeTip = tips.find((t) => t.title === "Gale-force winds");
    expect(galeTip?.message).toMatch(/suspend service|indoor backup/i);
  });

  it("treats ferry/cruise tags as wind-sensitive", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 8 };
    const tips = generateActivityTips(
      makeActivity({ tags: ["ferry"] }),
      makeLocation({ category: "landmark" }),
      { weatherForecast: forecast },
    );
    expect(tips.find((t) => t.title === "Breezy conditions")).toBeDefined();
  });

  it("does not fire breezy tip below threshold", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 6.5 };
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "viewpoint" }),
      { weatherForecast: forecast },
    );
    expect(tips.find((t) => t.title === "Breezy conditions")).toBeUndefined();
  });

  it("picks gale over strong at the boundary", () => {
    const forecast: WeatherForecast = { ...CLEAR_BASE, windSpeed: 17 };
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "viewpoint" }),
      { weatherForecast: forecast },
    );
    expect(tips.find((t) => t.title === "Gale-force winds")).toBeDefined();
    expect(tips.find((t) => t.title === "Strong winds")).toBeUndefined();
  });

  it("keeps both rain and gale tips on a rainy typhoon day (MAX_TOTAL interaction)", () => {
    // Rain priority 9 + Gale priority 9, both isImportant. The cap at 3
    // important tips should keep both: dropping either leaves a user without
    // either the slippery-paths or the gale-force warning on a dangerous day.
    const rainyGale: WeatherForecast = {
      date: "2026-09-20",
      condition: "rain",
      temperature: { min: 20, max: 24 },
      windSpeed: 20,
    };
    const tips = generateActivityTips(
      makeActivity({}),
      makeLocation({ category: "park" }),
      { weatherForecast: rainyGale },
    );
    expect(tips.find((t) => t.title === "Rain expected")).toBeDefined();
    expect(tips.find((t) => t.title === "Gale-force winds")).toBeDefined();
  });
});
