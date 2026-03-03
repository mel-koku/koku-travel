import { describe, it, expect, vi } from "vitest";
import type { Trip, TripDay, TripActivity } from "@/types/tripDomain";
import type { TravelerProfile } from "@/types/traveler";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock traveler profile builder
vi.mock("@/lib/domain/travelerProfile", () => ({
  buildTravelerProfile: vi.fn().mockReturnValue({
    pace: "balanced",
    budget: { level: "moderate" },
    mobility: { required: false },
    interests: ["culture"],
    group: { size: 1, type: "solo" },
    dietary: { restrictions: [] },
  }),
}));

// Mock modules used by generateTripFromBuilderData (not tested here)
vi.mock("@/lib/itineraryGenerator", () => ({ generateItinerary: vi.fn() }));
vi.mock("@/lib/itineraryPlanner", () => ({ planItinerary: vi.fn() }));
vi.mock("@/lib/locations/locationService", () => ({ fetchAllLocations: vi.fn() }));
vi.mock("@/lib/routeOptimizer", () => ({
  optimizeRouteOrder: vi.fn().mockReturnValue({ orderChanged: false, order: [] }),
}));
vi.mock("@/data/entryPoints", () => ({
  getCityCenterCoordinates: vi.fn().mockReturnValue({ lat: 35.0, lng: 135.7 }),
}));
vi.mock("@/lib/server/dayIntroGenerator", () => ({ generateDayIntros: vi.fn() }));
vi.mock("@/lib/server/intentExtractor", () => ({ extractTripIntent: vi.fn() }));
vi.mock("@/lib/server/guideProseGenerator", () => ({ generateGuideProse: vi.fn() }));
vi.mock("@/lib/server/dayRefinement", () => ({ refineDays: vi.fn() }));
vi.mock("@/data/dayTrips", () => ({ getDayTripsFromCity: vi.fn().mockReturnValue([]) }));
vi.mock("@/lib/utils/seasonUtils", () => ({
  getSeason: vi.fn().mockReturnValue("spring"),
  getSeasonalHighlightForDate: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/utils/airportBuffer", () => ({
  computeEffectiveArrivalStart: vi.fn(),
  computeEffectiveDepartureEnd: vi.fn(),
  computeRawEffectiveArrival: vi.fn(),
  getArrivalProcessing: vi.fn().mockReturnValue(90),
  getDepartureProcessing: vi.fn().mockReturnValue(120),
  LATE_ARRIVAL_THRESHOLD: 1140,
}));
vi.mock("@/lib/utils/timeUtils", () => ({
  parseTimeToMinutes: vi.fn().mockReturnValue(null),
  formatMinutesToTime: vi.fn().mockReturnValue("12:00"),
}));
vi.mock("@/lib/ratings/communityRatings", () => ({
  fetchCommunityRatings: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
const {
  convertItineraryToTrip,
  validateTripConstraints,
  parsePriceLevel,
  validateDayDuration,
  validateDayBudget,
  validateTotalBudget,
  validateNapScheduling,
} = await import("@/lib/server/itineraryEngine");

// ── Test helpers ──────────────────────────────────────────────────────

function createTripDay(overrides: Partial<TripDay> = {}): TripDay {
  return {
    id: "day-1",
    date: "2026-04-01",
    cityId: "kyoto",
    activities: [],
    ...overrides,
  };
}

function createTripActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    id: "act-1",
    locationId: "loc-1",
    timeSlot: "morning",
    duration: 60,
    ...overrides,
  };
}

const baseTravelerProfile: TravelerProfile = {
  pace: "balanced",
  budget: { level: "moderate" },
  mobility: { required: false },
  interests: ["culture"],
  group: { size: 1, type: "solo" },
  dietary: { restrictions: [] },
};

function createTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    travelerProfile: baseTravelerProfile,
    dates: { start: "2026-04-01", end: "2026-04-03" },
    regions: ["kansai"],
    cities: ["kyoto"],
    status: "planned",
    days: [createTripDay()],
    ...overrides,
  };
}

// ── parsePriceLevel ──────────────────────────────────────────────────

describe("parsePriceLevel", () => {
  it('parses "¥400" as numeric 400', () => {
    const result = parsePriceLevel("¥400");
    expect(result).toEqual({ level: 400, type: "numeric" });
  });

  it('parses "500" as numeric 500', () => {
    const result = parsePriceLevel("500");
    expect(result).toEqual({ level: 500, type: "numeric" });
  });

  it('parses "¥¥¥" as symbol 3', () => {
    const result = parsePriceLevel("¥¥¥");
    expect(result).toEqual({ level: 3, type: "symbol" });
  });

  it("returns 0 numeric for undefined", () => {
    expect(parsePriceLevel(undefined)).toEqual({ level: 0, type: "numeric" });
  });

  it("returns 0 numeric for empty string", () => {
    expect(parsePriceLevel("")).toEqual({ level: 0, type: "numeric" });
  });

  it('parses "¥ 1200" with space', () => {
    const result = parsePriceLevel("¥ 1200");
    expect(result).toEqual({ level: 1200, type: "numeric" });
  });
});

// ── validateDayDuration ──────────────────────────────────────────────

describe("validateDayDuration", () => {
  it("returns no issues when total <= 12 hours", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({ duration: 120 }),
        createTripActivity({ duration: 120 }),
        createTripActivity({ duration: 120 }),
      ],
    });
    expect(validateDayDuration(day, 0)).toEqual([]);
  });

  it("flags overpacked day (> 12 hours)", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({ duration: 300 }),
        createTripActivity({ duration: 300 }),
        createTripActivity({ duration: 200 }),
      ],
    });
    const issues = validateDayDuration(day, 0);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("overpacked");
  });

  it("returns no issues for empty day", () => {
    const day = createTripDay({ activities: [] });
    expect(validateDayDuration(day, 0)).toEqual([]);
  });
});

// ── validateDayBudget ────────────────────────────────────────────────

describe("validateDayBudget", () => {
  it("returns no issues when no per-day budget set", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({
          location: { minBudget: "¥2000" } as never,
        }),
      ],
    });
    const { issues } = validateDayBudget(day, 0, undefined);
    expect(issues).toEqual([]);
  });

  it("returns no issues when within budget", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({
          location: { minBudget: "¥1000" } as never,
        }),
      ],
    });
    const { issues, cost } = validateDayBudget(day, 0, 5000);
    expect(issues).toEqual([]);
    expect(cost).toBe(1000);
  });

  it("flags when exceeding budget with 10% tolerance", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({
          location: { minBudget: "¥5000" } as never,
        }),
        createTripActivity({
          location: { minBudget: "¥6000" } as never,
        }),
      ],
    });
    // Total: 11000, budget: 5000, tolerance: 5500
    const { issues } = validateDayBudget(day, 0, 5000);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("exceeds per-day budget");
  });

  it("passes within 10% tolerance", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({
          location: { minBudget: "¥5400" } as never,
        }),
      ],
    });
    // 5400 < 5000 * 1.1 = 5500
    const { issues } = validateDayBudget(day, 0, 5000);
    expect(issues).toEqual([]);
  });
});

// ── validateTotalBudget ──────────────────────────────────────────────

describe("validateTotalBudget", () => {
  it("returns no issues when within total budget", () => {
    expect(validateTotalBudget(10000, 15000)).toEqual([]);
  });

  it("returns no issues when budget is undefined", () => {
    expect(validateTotalBudget(10000, undefined)).toEqual([]);
  });

  it("flags when exceeding total budget", () => {
    const issues = validateTotalBudget(20000, 10000);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("exceeds total budget");
  });

  it("passes within 10% tolerance", () => {
    // 10500 < 10000 * 1.1 = 11000
    expect(validateTotalBudget(10500, 10000)).toEqual([]);
  });
});

// ── validateNapScheduling ────────────────────────────────────────────

describe("validateNapScheduling", () => {
  it("flags activities during 1pm-3pm nap window", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({ startTime: "13:30" }),
      ],
    });
    const issues = validateNapScheduling(day, 0);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("nap time");
  });

  it("returns no issues for activities outside nap window", () => {
    const day = createTripDay({
      activities: [
        createTripActivity({ startTime: "10:00" }),
        createTripActivity({ startTime: "16:00" }),
      ],
    });
    expect(validateNapScheduling(day, 0)).toEqual([]);
  });

  it("returns no issues when no start time", () => {
    const day = createTripDay({
      activities: [createTripActivity({ startTime: undefined })],
    });
    expect(validateNapScheduling(day, 0)).toEqual([]);
  });
});

// ── validateTripConstraints ──────────────────────────────────────────

describe("validateTripConstraints", () => {
  it("returns valid when no issues", () => {
    const trip = createTrip({
      days: [
        createTripDay({
          activities: [createTripActivity({ duration: 60 })],
        }),
      ],
    });
    const result = validateTripConstraints(trip);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("detects overpacked days", () => {
    const trip = createTrip({
      days: [
        createTripDay({
          activities: [
            createTripActivity({ duration: 400 }),
            createTripActivity({ duration: 400 }),
          ],
        }),
      ],
    });
    const result = validateTripConstraints(trip);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("overpacked"))).toBe(true);
  });

  it("skips budget checks when no budget set", () => {
    const trip = createTrip({
      travelerProfile: {
        ...baseTravelerProfile,
        budget: { level: "moderate" },
      },
    });
    const result = validateTripConstraints(trip);
    expect(result.valid).toBe(true);
  });

  it("detects nap conflicts for families with children", () => {
    const trip = createTrip({
      travelerProfile: {
        ...baseTravelerProfile,
        group: { size: 3, type: "family", childrenAges: [2] },
      },
      days: [
        createTripDay({
          activities: [createTripActivity({ startTime: "14:00" })],
        }),
      ],
    });
    const result = validateTripConstraints(trip);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("nap time"))).toBe(true);
  });

  it("skips nap check for non-family groups", () => {
    const trip = createTrip({
      travelerProfile: {
        ...baseTravelerProfile,
        group: { size: 2, type: "couple" },
      },
      days: [
        createTripDay({
          activities: [createTripActivity({ startTime: "14:00" })],
        }),
      ],
    });
    const result = validateTripConstraints(trip);
    // No nap issues for couples
    expect(result.issues.every((i) => !i.includes("nap"))).toBe(true);
  });
});

// ── convertItineraryToTrip ──────────────────────────────────────────

// Import test factories at top level
const fixtures = await import("../../fixtures/locations");
const itinFixtures = await import("../../fixtures/itinerary");

describe("convertItineraryToTrip", () => {
  const locA = fixtures.createTestLocation({ id: "loc-a", name: "Temple A" });
  const locB = fixtures.createTestLocation({ id: "loc-b", name: "Market B" });

  it("converts days with correct date strings", () => {
    const itinerary = itinFixtures.createTestItinerary({
      days: [
        itinFixtures.createTestItineraryDay({ id: "d1", cityId: "kyoto" }),
        itinFixtures.createTestItineraryDay({ id: "d2", cityId: "osaka" }),
      ],
    });
    const builder = itinFixtures.createTestBuilderData({
      dates: { start: "2026-04-01", end: "2026-04-02" },
      duration: 2,
    });
    const trip = convertItineraryToTrip(itinerary, builder, "t1", [locA, locB]);
    expect(trip.days[0]!.date).toBe("2026-04-01");
    expect(trip.days[1]!.date).toBe("2026-04-02");
  });

  it("filters note activities, keeps place activities", () => {
    const itinerary = itinFixtures.createTestItinerary({
      days: [
        itinFixtures.createTestItineraryDay({
          id: "d1",
          activities: [
            itinFixtures.createTestPlaceActivity({ title: "Temple A" }),
            itinFixtures.createTestNoteActivity({ notes: "Take a break" }),
            itinFixtures.createTestPlaceActivity({ title: "Market B" }),
          ],
        }),
      ],
    });
    const builder = itinFixtures.createTestBuilderData({ duration: 1 });
    const trip = convertItineraryToTrip(itinerary, builder, "t1", [locA, locB]);
    expect(trip.days[0]!.activities).toHaveLength(2);
  });

  it("maps meal type from activity tags", () => {
    const itinerary = itinFixtures.createTestItinerary({
      days: [
        itinFixtures.createTestItineraryDay({
          id: "d1",
          activities: [
            itinFixtures.createTestPlaceActivity({
              title: "Test",
              tags: ["dining"],
              mealType: undefined,
            }),
          ],
        }),
      ],
    });
    const builder = itinFixtures.createTestBuilderData({ duration: 1 });
    const trip = convertItineraryToTrip(itinerary, builder, "t1", []);
    expect(trip.days[0]!.activities[0]!.mealType).toBe("lunch");
  });

  it("falls back to first builder city when day has no cityId", () => {
    const itinerary = itinFixtures.createTestItinerary({
      days: [
        itinFixtures.createTestItineraryDay({ id: "d1", cityId: undefined }),
      ],
    });
    const builder = itinFixtures.createTestBuilderData({
      duration: 1,
      cities: ["osaka"],
    });
    const trip = convertItineraryToTrip(itinerary, builder, "t1", []);
    expect(trip.days[0]!.cityId).toBe("osaka");
  });

  it("includes traveler profile from builder data", () => {
    const itinerary = itinFixtures.createTestItinerary({
      days: [itinFixtures.createTestItineraryDay({ id: "d1" })],
    });
    const builder = itinFixtures.createTestBuilderData({ duration: 1 });
    const trip = convertItineraryToTrip(itinerary, builder, "t1", []);
    expect(trip.travelerProfile).toBeDefined();
    expect(trip.travelerProfile.pace).toBeDefined();
  });
});
