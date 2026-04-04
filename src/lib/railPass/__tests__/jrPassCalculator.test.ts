import { describe, expect, it } from "vitest";
import { calculateJRPassValue, calculatePassRecommendations } from "../jrPassCalculator";

describe("calculateJRPassValue", () => {
  it("recommends skip when pass is more expensive than individual tickets", () => {
    const result = calculateJRPassValue(7, ["tokyo", "osaka", "kyoto", "hiroshima", "fukuoka"]);
    // tokyo->osaka ¥13,870 + osaka->kyoto ¥580 + kyoto->hiroshima ¥11,420 + hiroshima->fukuoka ¥8,420 = ¥34,290
    expect(result.journeys).toHaveLength(4);
    expect(result.individualTotal).toBe(34290);
    expect(result.passType?.name).toBe("7-Day");
    expect(result.passType?.price).toBe(50000);
    expect(result.recommendation).toBe("skip");
    expect(result.savings).toBe(-15710);
  });

  it("recommends save for expensive multi-city routes", () => {
    // Tokyo -> Hiroshima (¥18,380) + Hiroshima -> Fukuoka (¥8,420) + Fukuoka -> Osaka (¥15,400) + Osaka -> Tokyo (¥13,870) = ¥56,070
    const result = calculateJRPassValue(7, ["tokyo", "hiroshima", "fukuoka", "osaka", "tokyo"]);
    expect(result.individualTotal).toBe(56070);
    expect(result.recommendation).toBe("save");
    expect(result.savings).toBe(6070);
  });

  it("skips journeys with no fare data", () => {
    const result = calculateJRPassValue(5, ["tokyo", "unknown_city", "osaka"]);
    expect(result.journeys).toHaveLength(0);
    expect(result.individualTotal).toBe(0);
  });

  it("skips consecutive duplicate cities", () => {
    const result = calculateJRPassValue(7, ["tokyo", "tokyo", "osaka"]);
    expect(result.journeys).toHaveLength(1);
    expect(result.journeys[0]!.from).toBe("tokyo");
    expect(result.journeys[0]!.to).toBe("osaka");
  });

  it("returns null passType when duration exceeds all passes", () => {
    const result = calculateJRPassValue(30, ["tokyo", "osaka"]);
    expect(result.passType).toBeNull();
    expect(result.recommendation).toBe("skip");
  });

  it("returns no journeys for single city", () => {
    const result = calculateJRPassValue(7, ["tokyo"]);
    expect(result.journeys).toHaveLength(0);
  });
});

describe("calculatePassRecommendations", () => {
  it("returns regional passes sorted by coverage", () => {
    const result = calculatePassRecommendations(7, ["osaka", "kyoto", "nara", "kobe"]);
    expect(result.regionalPasses.length).toBeGreaterThan(0);
    expect(result.regionalPasses[0]!.pass.coverageCities).toEqual(
      expect.arrayContaining(["osaka", "kyoto"])
    );
  });

  it("limits regional passes to 3", () => {
    const result = calculatePassRecommendations(7, ["tokyo", "osaka", "kyoto", "nara", "kobe", "hiroshima"]);
    expect(result.regionalPasses.length).toBeLessThanOrEqual(3);
  });
});
