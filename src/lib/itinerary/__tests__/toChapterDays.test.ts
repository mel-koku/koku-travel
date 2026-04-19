import { describe, it, expect } from "vitest";
import { toChapterDays } from "@/lib/itinerary/toChapterDays";
import type { Itinerary } from "@/types/itinerary";
import type { Location } from "@/types/location";

const stubLocation = (overrides: Partial<Location>): Location =>
  ({
    id: "loc-a",
    name: "Shibuya Sky",
    category: "view",
    ...overrides,
  }) as unknown as Location;

const stubItinerary = (): Itinerary =>
  ({
    days: [
      {
        id: "d0",
        dateLabel: "Day 1",
        cityId: "tokyo",
        activities: [
          {
            kind: "place",
            id: "a0",
            title: "Shibuya Sky",
            timeOfDay: "evening",
            durationMin: 90,
            locationId: "loc-a",
          },
        ],
      },
    ],
  }) as unknown as Itinerary;

describe("toChapterDays", () => {
  it("maps a single day with one activity into a chapter with one beat", () => {
    const locations = new Map<string, Location>([
      ["loc-a", stubLocation({ insiderTip: "Best at dusk." })],
    ]);

    const result = toChapterDays(stubItinerary(), undefined, locations);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d0");
    expect(result[0].beats).toHaveLength(1);
    expect(result[0].beats[0].body).toBe("Best at dusk.");
    expect(result[0].beats[0].partOfDay).toBe("Evening");
  });

  it("uses guideProse.intro when available, keyed by dayId", () => {
    const locations = new Map<string, Location>([
      ["loc-a", stubLocation({})],
    ]);
    const guideProse = {
      days: [{ dayId: "d0", intro: "Arrival evening in Shibuya.", transitions: [], summary: "" }],
    } as never;

    const result = toChapterDays(stubItinerary(), guideProse, locations);
    expect(result[0].intro).toBe("Arrival evening in Shibuya.");
  });

  it("falls back to editorialSummary, then category default, when insiderTip missing", () => {
    const locations = new Map<string, Location>([
      ["loc-a", stubLocation({ editorialSummary: "Kyoto's kitchen.", category: "market" })],
    ]);
    const result = toChapterDays(stubItinerary(), undefined, locations);
    expect(result[0].beats[0].body).toBe("Kyoto's kitchen.");
  });

  it("uses category fallback when both tips are missing", () => {
    const locations = new Map<string, Location>([
      ["loc-a", stubLocation({ category: "market" })],
    ]);
    const result = toChapterDays(stubItinerary(), undefined, locations);
    expect(result[0].beats[0].body).toBe("Walk end-to-end and graze.");
  });

  it("skips activities whose locationId is missing from the lookup", () => {
    const result = toChapterDays(stubItinerary(), undefined, new Map());
    expect(result[0].beats).toHaveLength(0);
  });

  it("threads travelToNext into transitToNext with minutes and mapped mode", () => {
    const itinerary = {
      days: [
        {
          id: "d0",
          dateLabel: "Day 1",
          cityId: "tokyo",
          activities: [
            {
              kind: "place",
              id: "a0",
              title: "A",
              timeOfDay: "morning",
              locationId: "loc-a",
              travelToNext: { mode: "train", durationMinutes: 18 },
            },
            {
              kind: "place",
              id: "a1",
              title: "B",
              timeOfDay: "afternoon",
              locationId: "loc-a",
            },
          ],
        },
      ],
    } as unknown as Itinerary;
    const locations = new Map<string, Location>([["loc-a", stubLocation({})]]);
    const result = toChapterDays(itinerary, undefined, locations);
    // Only assert on the narrow fields — new fields (steps, summary, totalFareYen) are
    // additive and may be undefined when no transitSteps are present.
    expect(result[0].beats[0].transitToNext).toMatchObject({ minutes: 18, mode: "train" });
    expect(result[0].beats[0].transitToNext?.line).toBeUndefined();
    expect(result[0].beats[1].transitToNext).toBeNull();
  });

  it("emits a closure inline note when ≥2 stops are closed on the date", () => {
    // With two closed stops on Thursday, should produce one inline note.
    const closedHours = {
      timezone: "Asia/Tokyo",
      periods: [
        { day: "monday", open: "09:00", close: "17:00" },
        { day: "tuesday", open: "09:00", close: "17:00" },
      ],
    };
    const locations = new Map<string, Location>([
      ["loc-a", stubLocation({ id: "loc-a", operatingHours: closedHours as never })],
      ["loc-b", stubLocation({ id: "loc-b", operatingHours: closedHours as never })],
    ]);
    const itinerary = {
      days: [
        {
          id: "d0",
          dateLabel: "Day 1",
          cityId: "tokyo",
          activities: [
            { kind: "place", id: "a0", title: "A", timeOfDay: "morning", locationId: "loc-a" },
            { kind: "place", id: "a1", title: "B", timeOfDay: "morning", locationId: "loc-b" },
          ],
        },
      ],
    } as unknown as Itinerary;
    // Pass 2026-04-23 Thursday as tripStartDate so closure detection fires.
    const result = toChapterDays(itinerary, undefined, locations, "2026-04-23");
    expect(result[0].inlineNotes).toHaveLength(1);
    expect(result[0].inlineNotes[0].kind).toBe("closure");
    expect(result[0].inlineNotes[0].label).toBe("2 stops closed on this date");
  });
});
