import { describe, it, expect } from "vitest";
import { getWeatherRegion } from "../regions";

describe("getWeatherRegion", () => {
  it("returns tropical_south for Okinawa cities", () => {
    expect(getWeatherRegion("naha")).toBe("tropical_south");
    expect(getWeatherRegion("ishigaki")).toBe("tropical_south");
  });

  it("returns subarctic_north for Hokkaido cities", () => {
    expect(getWeatherRegion("sapporo")).toBe("subarctic_north");
    expect(getWeatherRegion("hakodate")).toBe("subarctic_north");
  });

  it("returns temperate for mainland cities", () => {
    expect(getWeatherRegion("tokyo")).toBe("temperate");
    expect(getWeatherRegion("kyoto")).toBe("temperate");
    expect(getWeatherRegion("fukuoka")).toBe("temperate");
  });

  it("returns temperate as a safe default for unknown cities", () => {
    expect(getWeatherRegion("totally-not-a-city" as never)).toBe("temperate");
  });
});
