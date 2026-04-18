import { describe, it, expect } from "vitest";
import { getWeatherRegion } from "../regions";

describe("getWeatherRegion", () => {
  it("returns tropical_south for Okinawa cities", () => {
    expect(getWeatherRegion("naha")).toBe("tropical_south");
    expect(getWeatherRegion("ishigaki")).toBe("tropical_south");
    // regression: canonical ID is "miyako", not "miyakojima"
    expect(getWeatherRegion("miyako")).toBe("tropical_south");
    expect(getWeatherRegion("amami")).toBe("tropical_south");
  });

  it("does NOT return tropical_south for the region ID okinawa", () => {
    // "okinawa" is a region ID, not a city — must not match tropical_south
    expect(getWeatherRegion("okinawa" as never)).toBe("temperate");
  });

  it("does NOT return tropical_south for the bogus city ID miyakojima", () => {
    expect(getWeatherRegion("miyakojima" as never)).toBe("temperate");
  });

  it("returns subarctic_north for Hokkaido cities", () => {
    expect(getWeatherRegion("sapporo")).toBe("subarctic_north");
    expect(getWeatherRegion("hakodate")).toBe("subarctic_north");
    expect(getWeatherRegion("asahikawa")).toBe("subarctic_north");
    expect(getWeatherRegion("kushiro")).toBe("subarctic_north");
    expect(getWeatherRegion("abashiri")).toBe("subarctic_north");
    expect(getWeatherRegion("wakkanai")).toBe("subarctic_north");
  });

  it("does NOT return subarctic_north for non-existent Hokkaido city IDs", () => {
    expect(getWeatherRegion("otaru" as never)).toBe("temperate");
    expect(getWeatherRegion("noboribetsu" as never)).toBe("temperate");
    expect(getWeatherRegion("furano" as never)).toBe("temperate");
    expect(getWeatherRegion("biei" as never)).toBe("temperate");
    expect(getWeatherRegion("niseko" as never)).toBe("temperate");
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
