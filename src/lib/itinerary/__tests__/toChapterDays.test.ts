import { describe, it, expect } from "vitest";
import { toChapterDays } from "@/lib/itinerary/toChapterDays";
import { resolveEffectiveDayEntryPoints } from "@/lib/itinerary/accommodationDefaults";
import type { Itinerary } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { CityAccommodation, DayEntryPoint, EntryPoint } from "@/types/trip";

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

  it("renders a beat for a custom activity with coordinates but no locationId", () => {
    // Custom activities (Add custom stop, meal-slot suggestions) don't have a
    // catalog Location — they carry their own title, coordinates, photo, etc.
    // Without this support they get filtered out of beats and never appear in
    // the timeline even though the map sees their coordinates. Bug surfaced
    // by PR #126's meal-slot Doutor suggestions.
    const itinerary = {
      days: [
        {
          id: "d0",
          dateLabel: "Day 1",
          cityId: "tokyo",
          activities: [
            {
              kind: "place",
              id: "custom-doutor-1",
              title: "Doutor Coffee Ueno",
              timeOfDay: "morning",
              durationMin: 30,
              isCustom: true,
              mealType: "breakfast",
              coordinates: { lat: 35.7141, lng: 139.7775 },
              address: "1-1 Ueno, Taito",
              notes: "Quick stop for coffee before the day kicks off.",
              photoUrl: "/photo.jpg",
            },
          ],
        },
      ],
    } as unknown as Itinerary;

    const result = toChapterDays(itinerary, undefined, new Map());
    expect(result[0].beats).toHaveLength(1);
    expect(result[0].beats[0].id).toBe("custom-doutor-1");
    expect(result[0].beats[0].location.name).toBe("Doutor Coffee Ueno");
    expect(result[0].beats[0].location.coordinates).toEqual({ lat: 35.7141, lng: 139.7775 });
    expect(result[0].beats[0].partOfDay).toBe("Morning");
  });

  it("still drops catalog activities (with locationId) when the location lookup misses", () => {
    // Counter-regression: the custom-activity path must not accidentally
    // rescue catalog activities whose locationId is missing from the map —
    // that case still indicates a data integrity issue and should drop.
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
              title: "Catalog place",
              timeOfDay: "morning",
              durationMin: 60,
              locationId: "missing-id",
            },
          ],
        },
      ],
    } as unknown as Itinerary;
    const result = toChapterDays(itinerary, undefined, new Map());
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

  it("prefers schedule.arrivalTime over a stale travelFromPrevious.arrivalTime", () => {
    // Regression: after a re-plan that reorders activities, the first place
    // activity has no incoming route. Its `travelFromPrevious` may still
    // carry stale times from a prior layout. The renderer must trust
    // `schedule.arrivalTime` (planner sets it fresh) over the stale field.
    const locations = new Map<string, Location>([["loc-a", stubLocation({})]]);
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
              title: "Now-first activity",
              timeOfDay: "morning",
              locationId: "loc-a",
              schedule: { arrivalTime: "08:30", departureTime: "10:00", status: "scheduled" },
              // Stale field from before reorder — must not win.
              travelFromPrevious: { mode: "train", durationMinutes: 12, arrivalTime: "19:54" },
            },
          ],
        },
      ],
    } as unknown as Itinerary;
    const result = toChapterDays(itinerary, undefined, locations);
    expect(result[0].beats[0].time).toBe("08:30");
  });

  it("emits empty string when insiderTip, editorialSummary, and category fallback all miss", () => {
    const locations = new Map<string, Location>([
      ["loc-a", stubLocation({ category: "unknown-category" })],
    ]);
    const result = toChapterDays(stubItinerary(), undefined, locations);
    expect(result[0].beats[0].body).toBe("");
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

  describe("start/end anchors (KOK-29)", () => {
    it("emits a startAnchor with isArrivalAirport=true when Day 1 entry is the trip airport", () => {
      const locations = new Map<string, Location>([["loc-a", stubLocation({})]]);
      const dayEntryPoints = {
        d0: {
          startPoint: {
            type: "airport" as const,
            id: "kix",
            name: "Kansai Intl.",
            iataCode: "KIX",
            coordinates: { lat: 34.43, lng: 135.24 },
          },
          endPoint: undefined,
        },
      };
      const result = toChapterDays(
        stubItinerary(),
        undefined,
        locations,
        undefined,
        undefined,
        undefined,
        dayEntryPoints,
      );
      expect(result[0].startAnchor?.point.iataCode).toBe("KIX");
      expect(result[0].startAnchor?.isArrivalAirport).toBe(true);
      expect(result[0].endAnchor).toBeUndefined();
    });

    it("emits start + end anchors for an accommodation on a mid-trip day", () => {
      const itinerary = {
        days: [
          { id: "d0", dateLabel: "Day 1", cityId: "tokyo", activities: [] },
          { id: "d1", dateLabel: "Day 2", cityId: "kyoto", activities: [] },
        ],
      } as unknown as Itinerary;
      const accom = {
        type: "accommodation" as const,
        id: "ryokan-1",
        name: "Tawaraya Ryokan",
        coordinates: { lat: 35.01, lng: 135.76 },
      };
      const dayEntryPoints = {
        d1: { startPoint: accom, endPoint: accom },
      };
      const result = toChapterDays(
        itinerary,
        undefined,
        new Map(),
        undefined,
        undefined,
        undefined,
        dayEntryPoints,
      );
      expect(result[1].startAnchor?.point.name).toBe("Tawaraya Ryokan");
      expect(result[1].startAnchor?.isArrivalAirport).toBe(false);
      expect(result[1].endAnchor?.point.name).toBe("Tawaraya Ryokan");
    });

    it("filters out city-center synthetic fallbacks (only airport + accommodation render anchors)", () => {
      const dayEntryPoints = {
        d0: {
          startPoint: {
            type: "custom" as const,
            id: "city-center-tokyo",
            name: "Tokyo city center",
            coordinates: { lat: 35.68, lng: 139.76 },
          },
          endPoint: undefined,
        },
      };
      const result = toChapterDays(
        stubItinerary(),
        undefined,
        new Map(),
        undefined,
        undefined,
        undefined,
        dayEntryPoints,
      );
      expect(result[0].startAnchor).toBeUndefined();
      expect(result[0].endAnchor).toBeUndefined();
    });

    it("renders no anchors when the day's entry-point map entry is absent", () => {
      // toChapterDays must not invent anchors when no resolved entry exists.
      const result = toChapterDays(
        stubItinerary(),
        undefined,
        new Map(),
        undefined,
        undefined,
        undefined,
        {},
      );
      expect(result[0].startAnchor).toBeUndefined();
      expect(result[0].endAnchor).toBeUndefined();
    });

    it("end-to-end: clearedStart + clearedEnd suppresses both anchors despite city accommodation", () => {
      // Pins the integration with KOK-27's clear flags: even when a city-level
      // accommodation is set, an explicit X-clear on a day must produce no
      // start AND no end anchor in the timeline.
      const itinerary = {
        days: [
          { id: "d0", dateLabel: "Day 1", cityId: "osaka", activities: [] },
          { id: "d1", dateLabel: "Day 2", cityId: "osaka", activities: [] },
        ],
      } as unknown as Itinerary;
      const sheraton: EntryPoint = {
        type: "accommodation",
        id: "sheraton-osaka",
        name: "Sheraton Miyako Osaka",
        coordinates: { lat: 34.65, lng: 135.52 },
      };
      const cityAccommodations: Record<string, CityAccommodation> = {
        "trip-1-osaka": { cityId: "osaka", entryPoint: sheraton },
      };
      const dayEntryPoints: Record<string, DayEntryPoint> = {
        "trip-1-d1": { clearedStart: true, clearedEnd: true },
      };
      const resolved = resolveEffectiveDayEntryPoints(
        itinerary,
        "trip-1",
        dayEntryPoints,
        cityAccommodations,
      );
      const chapters = toChapterDays(
        itinerary,
        undefined,
        new Map(),
        undefined,
        undefined,
        undefined,
        resolved,
      );
      // Day 1 (no clear) gets the city accommodation as both anchors.
      expect(chapters[0].startAnchor?.point.name).toBe("Sheraton Miyako Osaka");
      expect(chapters[0].endAnchor?.point.name).toBe("Sheraton Miyako Osaka");
      // Day 2 (cleared both sides) renders no anchors.
      expect(chapters[1].startAnchor).toBeUndefined();
      expect(chapters[1].endAnchor).toBeUndefined();
    });

    it("does not render anchors on locked days", () => {
      const itinerary = {
        days: [
          { id: "d0", dateLabel: "Day 1", cityId: "tokyo", activities: [] },
          { id: "d1", dateLabel: "Day 2", cityId: "kyoto", activities: [] },
        ],
      } as unknown as Itinerary;
      const accom = {
        type: "accommodation" as const,
        id: "h",
        name: "Hotel",
        coordinates: { lat: 35.01, lng: 135.76 },
      };
      const dayEntryPoints = {
        d1: { startPoint: accom, endPoint: accom },
      };
      const result = toChapterDays(
        itinerary,
        undefined,
        new Map(),
        undefined,
        (idx) => idx === 0,
        undefined,
        dayEntryPoints,
      );
      expect(result[1].isLocked).toBe(true);
      expect(result[1].startAnchor).toBeUndefined();
      expect(result[1].endAnchor).toBeUndefined();
    });
  });

  describe("server-set isLocked takes precedence over client gate", () => {
    // Pins the post-signin claim-window fix. After a guest signs in, the
    // client gate (`fullAccessEnabled`) flips to true before the rehydrate
    // re-fetch returns. Without this composition, ChapterList would render
    // empty Day 2-N (activities are still []). The server `day.isLocked`
    // flag must override the client gate until the rehydrate ships data.
    it("renders day as locked when day.isLocked=true even when predicate says accessible", () => {
      const itineraryWithLocked: Itinerary = {
        days: [
          { id: "d0", dateLabel: "Day 1", cityId: "tokyo", activities: [] },
          {
            id: "d1",
            dateLabel: "Day 2",
            cityId: "kyoto",
            isLocked: true,
            activities: [],
          },
        ],
      } as unknown as Itinerary;

      // Mirror the predicate composition used by ItineraryShell. The first
      // term is the client gate (fullAccessEnabled, here forced to true to
      // simulate the post-signin claim window); the second is the server flag.
      const fullAccessEnabled = true as boolean;
      const predicate = (dayIdx: number): boolean =>
        fullAccessEnabled && !itineraryWithLocked.days[dayIdx]?.isLocked;

      const result = toChapterDays(itineraryWithLocked, undefined, new Map(), undefined, predicate);

      expect(result[0].isLocked).toBe(false);
      expect(result[1].isLocked).toBe(true);
      expect(result[1].beats).toEqual([]);
    });
  });
});
