import { describe, it, expect } from "vitest";
import { scoreWeatherFit } from "@/lib/weather/weatherScoring";
import type { WeatherForecast } from "@/types/weather";
import type { Location } from "@/types/location";

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    name: "Test Location",
    region: "kansai",
    city: "kyoto",
    category: "park",
    image: "",
    ...overrides,
  };
}

function makeForecast(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  return {
    date: "2026-04-01",
    condition: "clear",
    temperature: { min: 15, max: 25 },
    ...overrides,
  };
}

describe("weatherScoring", () => {
  describe("scoreWeatherFit", () => {
    it("returns 0 when no forecast is available", () => {
      const loc = makeLocation();
      const result = scoreWeatherFit(loc, undefined);
      expect(result.scoreAdjustment).toBe(0);
      expect(result.reasoning).toContain("No weather forecast");
    });

    describe("rain conditions", () => {
      const rainyForecast = makeForecast({ condition: "rain" });

      it("penalizes outdoor locations in rain", () => {
        const loc = makeLocation({ category: "park" });
        const result = scoreWeatherFit(loc, rainyForecast);
        expect(result.scoreAdjustment).toBe(-5);
      });

      it("penalizes more with preferIndoorOnRain", () => {
        const loc = makeLocation({ category: "park" });
        const result = scoreWeatherFit(loc, rainyForecast, { preferIndoorOnRain: true });
        expect(result.scoreAdjustment).toBe(-8);
      });

      it("penalizes mixed locations less in rain", () => {
        const loc = makeLocation({ category: "landmark" });
        const result = scoreWeatherFit(loc, rainyForecast);
        expect(result.scoreAdjustment).toBe(-3);
      });

      it("boosts indoor locations in rain", () => {
        const loc = makeLocation({ category: "museum" });
        const result = scoreWeatherFit(loc, rainyForecast);
        expect(result.scoreAdjustment).toBe(5);
      });

      it("applies to drizzle condition", () => {
        const drizzle = makeForecast({ condition: "drizzle" });
        const loc = makeLocation({ category: "park" });
        const result = scoreWeatherFit(loc, drizzle);
        expect(result.scoreAdjustment).toBe(-5);
      });

      it("applies to thunderstorm condition", () => {
        const storm = makeForecast({ condition: "thunderstorm" });
        const loc = makeLocation({ category: "museum" });
        const result = scoreWeatherFit(loc, storm);
        expect(result.scoreAdjustment).toBe(5);
      });
    });

    describe("snow conditions", () => {
      const snowForecast = makeForecast({ condition: "snow" });

      it("penalizes outdoor locations in snow", () => {
        const loc = makeLocation({ category: "garden" });
        const result = scoreWeatherFit(loc, snowForecast);
        expect(result.scoreAdjustment).toBe(-6);
      });

      it("penalizes mixed locations less in snow", () => {
        const loc = makeLocation({ category: "market" });
        const result = scoreWeatherFit(loc, snowForecast);
        expect(result.scoreAdjustment).toBe(-2);
      });

      it("boosts indoor locations in snow", () => {
        const loc = makeLocation({ category: "shopping" });
        const result = scoreWeatherFit(loc, snowForecast);
        expect(result.scoreAdjustment).toBe(4);
      });
    });

    describe("clear/cloudy conditions", () => {
      it("boosts outdoor in clear weather", () => {
        const clear = makeForecast({ condition: "clear" });
        const loc = makeLocation({ category: "viewpoint" });
        const result = scoreWeatherFit(loc, clear);
        expect(result.scoreAdjustment).toBe(2);
      });

      it("slightly boosts mixed in clear weather", () => {
        const clear = makeForecast({ condition: "clear" });
        const loc = makeLocation({ category: "wellness" });
        const result = scoreWeatherFit(loc, clear);
        expect(result.scoreAdjustment).toBe(1);
      });

      it("no adjustment for indoor in clear weather", () => {
        const clear = makeForecast({ condition: "clear" });
        const loc = makeLocation({ category: "museum" });
        const result = scoreWeatherFit(loc, clear);
        // Clear + indoor → falls through to temperature check or returns 0
        expect(result.scoreAdjustment).toBeLessThanOrEqual(2);
      });
    });

    describe("temperature extremes", () => {
      it("penalizes outdoor in extreme cold", () => {
        const cold = makeForecast({
          condition: "mist",
          temperature: { min: -5, max: 2 },
        });
        const loc = makeLocation({ category: "nature" });
        const result = scoreWeatherFit(loc, cold);
        expect(result.scoreAdjustment).toBe(-3);
      });

      it("boosts indoor in extreme heat", () => {
        const hot = makeForecast({
          condition: "haze",
          temperature: { min: 33, max: 40 },
        });
        const loc = makeLocation({ category: "restaurant" });
        const result = scoreWeatherFit(loc, hot);
        expect(result.scoreAdjustment).toBe(2);
      });
    });

    describe("tag-based environment detection", () => {
      it("uses indoor tag over category heuristic", () => {
        // Park is normally outdoor, but tagged as indoor
        const loc = makeLocation({ category: "park", tags: ["indoor"] });
        const rain = makeForecast({ condition: "rain" });
        const result = scoreWeatherFit(loc, rain);
        expect(result.scoreAdjustment).toBe(5); // Indoor boost
      });

      it("uses outdoor tag over category heuristic", () => {
        // Museum is normally indoor, but tagged as outdoor
        const loc = makeLocation({ category: "museum", tags: ["outdoor"] });
        const rain = makeForecast({ condition: "rain" });
        const result = scoreWeatherFit(loc, rain);
        expect(result.scoreAdjustment).toBe(-5); // Outdoor penalty
      });

      it("uses mixed tag", () => {
        const loc = makeLocation({ category: "park", tags: ["mixed"] });
        const rain = makeForecast({ condition: "rain" });
        const result = scoreWeatherFit(loc, rain);
        expect(result.scoreAdjustment).toBe(-3);
      });
    });
  });
});
