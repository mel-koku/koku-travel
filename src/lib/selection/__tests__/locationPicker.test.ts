import { describe, it, expect } from "vitest";
import { pickLocationForTimeSlot } from "../locationPicker";
import type { Location } from "@/types/location";

function makeLocation(overrides: Partial<Location> & { id: string; name: string; category: string }): Location {
  return {
    region: "Kanto",
    city: "Tokyo",
    ...overrides,
  } as Location;
}

describe("pickLocationForTimeSlot evening category filter", () => {
  const landmark = makeLocation({
    id: "hakata-port",
    name: "Hakata Port",
    category: "landmark",
  });

  const landmarkWithEveningHours = makeLocation({
    id: "tokyo-tower",
    name: "Tokyo Tower",
    category: "landmark",
    operatingHours: {
      timezone: "Asia/Tokyo",
      periods: [
        { day: "monday", open: "09:00", close: "22:00" },
        { day: "tuesday", open: "09:00", close: "22:00" },
        { day: "wednesday", open: "09:00", close: "22:00" },
        { day: "thursday", open: "09:00", close: "22:00" },
        { day: "friday", open: "09:00", close: "22:00" },
        { day: "saturday", open: "09:00", close: "22:00" },
        { day: "sunday", open: "09:00", close: "22:00" },
      ],
    },
  });

  const restaurant = makeLocation({
    id: "ramen-shop",
    name: "Ramen Shop",
    category: "restaurant",
  });

  const museum = makeLocation({
    id: "peace-museum",
    name: "Peace Museum",
    category: "museum",
  });

  it("allows landmark after 6 PM (evening-appropriate category)", () => {
    const result = pickLocationForTimeSlot(
      [landmark],
      "culture",
      new Set(),
      120, // availableMinutes <= 180 = past 6 PM
      10,
      undefined, [], "balanced", ["culture"],
      undefined, undefined, undefined, undefined,
      "evening", "2024-01-01",
    );
    expect(result).toBeDefined();
  });

  it("allows restaurant after 6 PM", () => {
    const result = pickLocationForTimeSlot(
      [restaurant],
      "food",
      new Set(),
      120,
      10,
      undefined, [], "balanced", ["food"],
      undefined, undefined, undefined, undefined,
      "evening", "2024-01-01",
    );
    expect(result).toBeDefined();
    expect(result?.id).toBe("ramen-shop");
  });

  it("allows daytime landmark after 6 PM when hours confirm open", () => {
    const result = pickLocationForTimeSlot(
      [landmarkWithEveningHours],
      "culture",
      new Set(),
      120,
      10,
      undefined, [], "balanced", ["culture"],
      undefined, undefined, undefined, undefined,
      "evening", "2024-01-01",
    );
    expect(result).toBeDefined();
    expect(result?.id).toBe("tokyo-tower");
  });

  it("does not filter daytime categories before 6 PM", () => {
    const result = pickLocationForTimeSlot(
      [landmark],
      "culture",
      new Set(),
      220, // > 180 = before 6 PM
      10,
      undefined, [], "balanced", ["culture"],
      undefined, undefined, undefined, undefined,
      "evening", "2024-01-01",
    );
    expect(result).toBeDefined();
  });

  it("filters museum without hours after 6 PM", () => {
    const result = pickLocationForTimeSlot(
      [museum],
      "culture",
      new Set(),
      120,
      10,
      undefined, [], "balanced", ["culture"],
      undefined, undefined, undefined, undefined,
      "evening", "2024-01-01",
    );
    expect(result).toBeUndefined();
  });
});
