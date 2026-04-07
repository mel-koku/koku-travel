import { describe, it, expect } from "vitest";
import { generateActivityTips } from "../tipGenerator";

describe("generateActivityTips", () => {
  it("should cap total tips at MAX_TOTAL", () => {
    // Use a location that generates many tips
    const location = {
      id: "test-onsen",
      name: "Test Onsen",
      region: "Kansai",
      city: "Kyoto",
      category: "onsen",
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
