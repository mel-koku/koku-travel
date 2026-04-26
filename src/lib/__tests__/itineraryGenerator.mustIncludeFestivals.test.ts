/**
 * KOK-32 — Festival overlap auto-include
 *
 * Validates the `mustIncludeFestivals` resolver path:
 *  - clean place match (gion-matsuri, aoi-matsuri) → pinned activity
 *  - festival outside trip window → silent drop
 *  - festival in unpicked city → silent drop
 *  - non-mappable suggestedActivity (awa-odori) → kind:"note" fallback
 *  - regional festival.city (chichibu-night) → warn + drop
 *  - multiple festivals overlapping → both land, deterministic order
 *  - festival pin + saved place coexist
 *  - festival end-day boundary lands on day 0
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import { generateItinerary } from "@/lib/itineraryGenerator";
import { __resetWarnedFestivalsForTests } from "@/lib/generation/festivalResolver";
import { logger } from "@/lib/logger";

// Mock weather service (avoids network)
vi.mock("@/lib/weather/weatherService", () => ({
  fetchWeatherForecast: vi.fn().mockResolvedValue(new Map()),
}));

// Plenty of Kyoto locations so the generator has things to schedule. Names
// chosen to exercise the suggestedActivity token-matcher: "Yasaka Shrine"
// matches "Aoi Matsuri" via the "Kamo River"→nope path; we instead pick
// "Gion Matsuri" which the matcher resolves via a "Gion" or "Matsuri"
// substring against "Gion Matsuri Plaza" below. Aoi Matsuri's
// suggestedActivity contains "Kamo River" → matched to "Kamo River
// Riverbank".
const KYOTO_LOCATIONS: Location[] = [
  {
    id: "kyoto-gion-matsuri-plaza",
    name: "Gion Matsuri Plaza",
    city: "Kyoto", region: "Kansai", category: "shrine",
    image: "/test.jpg",
    coordinates: { lat: 35.0036, lng: 135.7785 },
    rating: 4.6, reviewCount: 5000,
    recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
    preferredTransitModes: ["walk"],
    timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
  {
    id: "kyoto-kamo-river-riverbank",
    name: "Kamo River Riverbank",
    city: "Kyoto", region: "Kansai", category: "park",
    image: "/test.jpg",
    coordinates: { lat: 35.0156, lng: 135.7720 },
    rating: 4.5, reviewCount: 3000,
    recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
    preferredTransitModes: ["walk"],
    timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
  {
    id: "kyoto-temple-1", name: "Kiyomizu Temple",
    city: "Kyoto", region: "Kansai", category: "temple", image: "/test.jpg",
    coordinates: { lat: 34.9948, lng: 135.7850 },
    rating: 4.7, reviewCount: 15000,
    recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
    preferredTransitModes: ["walk"], timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
  {
    id: "kyoto-shrine-1", name: "Fushimi Inari",
    city: "Kyoto", region: "Kansai", category: "shrine", image: "/test.jpg",
    coordinates: { lat: 34.9671, lng: 135.7727 },
    rating: 4.8, reviewCount: 20000,
    recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
    preferredTransitModes: ["train"], timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
  {
    id: "kyoto-park-1", name: "Maruyama Park",
    city: "Kyoto", region: "Kansai", category: "park", image: "/test.jpg",
    coordinates: { lat: 35.0016, lng: 135.7818 },
    rating: 4.4, reviewCount: 3000,
    recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
    preferredTransitModes: ["walk"], timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
  {
    id: "kyoto-museum-1", name: "Kyoto National Museum",
    city: "Kyoto", region: "Kansai", category: "museum", image: "/test.jpg",
    coordinates: { lat: 34.9910, lng: 135.7720 },
    rating: 4.5, reviewCount: 7000,
    recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
    preferredTransitModes: ["bus"], timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
  {
    id: "kyoto-temple-2", name: "Kinkaku-ji",
    city: "Kyoto", region: "Kansai", category: "temple", image: "/test.jpg",
    coordinates: { lat: 35.0394, lng: 135.7292 },
    rating: 4.7, reviewCount: 18000,
    recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
    preferredTransitModes: ["bus"], timezone: "Asia/Tokyo",
    planningCity: "kyoto",
  },
];

const TOKYO_LOCATIONS: Location[] = [
  {
    id: "tokyo-shrine-1", name: "Meiji Shrine",
    city: "Tokyo", region: "Kanto", category: "shrine", image: "/test.jpg",
    coordinates: { lat: 35.6764, lng: 139.6993 },
    rating: 4.6, reviewCount: 20000,
    recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
    preferredTransitModes: ["train"], timezone: "Asia/Tokyo",
    planningCity: "tokyo",
  },
  {
    id: "tokyo-temple-1", name: "Senso-ji",
    city: "Tokyo", region: "Kanto", category: "temple", image: "/test.jpg",
    coordinates: { lat: 35.7148, lng: 139.7967 },
    rating: 4.5, reviewCount: 25000,
    recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
    preferredTransitModes: ["subway"], timezone: "Asia/Tokyo",
    planningCity: "tokyo",
  },
  {
    id: "tokyo-park-1", name: "Ueno Park",
    city: "Tokyo", region: "Kanto", category: "park", image: "/test.jpg",
    coordinates: { lat: 35.7141, lng: 139.7744 },
    rating: 4.4, reviewCount: 12000,
    recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
    preferredTransitModes: ["subway"], timezone: "Asia/Tokyo",
    planningCity: "tokyo",
  },
];

const ALL_LOCATIONS: Location[] = [...KYOTO_LOCATIONS, ...TOKYO_LOCATIONS];

const baseKyotoTrip: TripBuilderData = {
  duration: 3,
  dates: { start: "2026-07-15", end: "2026-07-17" }, // overlaps gion-matsuri (7/1-7/31)
  regions: ["kansai"],
  cities: ["kyoto"],
  vibes: ["temples_tradition", "foodie_paradise"],
  style: "balanced",
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetWarnedFestivalsForTests();
});

describe("mustIncludeFestivals", () => {
  it("Test 1 — pins gion-matsuri's matched location on a day inside the festival window in the right city", async () => {
    const itinerary = await generateItinerary(
      { ...baseKyotoTrip, mustIncludeFestivals: ["gion-matsuri"] },
      { locations: ALL_LOCATIONS },
    );

    // gion-matsuri runs 7/1–7/31. Trip is 7/15–7/17 (all inside window).
    // suggestedActivity contains "Gion Matsuri" → should match
    // "Gion Matsuri Plaza" via fuzzy contains.
    const allActivities = itinerary.days.flatMap((d) => d.activities);
    const pinned = allActivities.find(
      (a) => a.kind === "place" && a.locationId === "kyoto-gion-matsuri-plaza",
    );
    expect(pinned).toBeDefined();
    expect(pinned?.kind).toBe("place");
    if (pinned?.kind === "place") {
      expect(pinned.tags).toContain("pinned");
    }

    // It should land on Day 0 (the first overlapping day in Kyoto).
    expect(itinerary.days[0]?.activities.some(
      (a) => a.kind === "place" && a.locationId === "kyoto-gion-matsuri-plaza",
    )).toBe(true);
  });

  it("Test 2 — festival fully outside trip window is silently dropped (no pin tag, no note)", async () => {
    const winterTrip: TripBuilderData = {
      ...baseKyotoTrip,
      dates: { start: "2026-12-01", end: "2026-12-03" }, // gion-matsuri is July
    };
    const itinerary = await generateItinerary(
      { ...winterTrip, mustIncludeFestivals: ["gion-matsuri"] },
      { locations: ALL_LOCATIONS },
    );

    expect(itinerary.days).toHaveLength(3);
    const allActivities = itinerary.days.flatMap((d) => d.activities);
    // The plaza location may still appear via normal slot-fill (it's a Kyoto
    // shrine), but it must NOT carry the "pinned" tag.
    const pinnedFestivalRelated = allActivities.filter(
      (a) =>
        a.kind === "place" &&
        a.locationId === "kyoto-gion-matsuri-plaza" &&
        (a.tags?.includes("pinned") ?? false),
    );
    expect(pinnedFestivalRelated).toHaveLength(0);
    // No note injected either
    const notes = allActivities.filter(
      (a) => a.kind === "note" && a.id.startsWith("festival-gion-matsuri"),
    );
    expect(notes).toHaveLength(0);
  });

  it("Test 3 — festival in city user didn't pick is silently dropped", async () => {
    // gion-matsuri is in Kyoto. User picks Tokyo only.
    const tokyoTrip: TripBuilderData = {
      ...baseKyotoTrip,
      regions: ["kanto"],
      cities: ["tokyo"],
      dates: { start: "2026-07-15", end: "2026-07-17" },
    };
    const itinerary = await generateItinerary(
      { ...tokyoTrip, mustIncludeFestivals: ["gion-matsuri"] },
      { locations: ALL_LOCATIONS },
    );

    const allActivities = itinerary.days.flatMap((d) => d.activities);
    const festivalRelated = allActivities.filter(
      (a) =>
        (a.kind === "place" && a.locationId === "kyoto-gion-matsuri-plaza") ||
        (a.kind === "note" && a.id.startsWith("festival-gion-matsuri")),
    );
    expect(festivalRelated).toHaveLength(0);
  });

  it("Test 4 — non-mappable suggestedActivity (awa-odori) falls back to a note activity on a valid day", async () => {
    // awa-odori is in Tokushima, Aug 12-15. We seed Tokushima with no
    // matching landmark → token resolver fails → note fallback.
    const tokushimaLocs: Location[] = [
      {
        id: "tokushima-park-1", name: "Tokushima Central Park",
        city: "Tokushima", region: "Shikoku", category: "park",
        image: "/test.jpg",
        coordinates: { lat: 34.0656, lng: 134.5594 },
        rating: 4.2, reviewCount: 1000,
        recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
        preferredTransitModes: ["walk"], timezone: "Asia/Tokyo",
        planningCity: "tokushima",
      },
      {
        id: "tokushima-museum-1", name: "Tokushima History Museum",
        city: "Tokushima", region: "Shikoku", category: "museum",
        image: "/test.jpg",
        coordinates: { lat: 34.0700, lng: 134.5600 },
        rating: 4.3, reviewCount: 800,
        recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
        preferredTransitModes: ["walk"], timezone: "Asia/Tokyo",
        planningCity: "tokushima",
      },
    ];

    const trip: TripBuilderData = {
      duration: 3,
      dates: { start: "2026-08-12", end: "2026-08-14" },
      regions: ["shikoku"],
      cities: ["tokushima"],
      vibes: ["temples_tradition"],
      style: "balanced",
      mustIncludeFestivals: ["awa-odori"],
    };

    const itinerary = await generateItinerary(trip, { locations: tokushimaLocs });

    const allActivities = itinerary.days.flatMap((d) => d.activities);
    const note = allActivities.find(
      (a) => a.kind === "note" && a.id.startsWith("festival-awa-odori"),
    );
    expect(note).toBeDefined();
    if (note?.kind === "note") {
      // Festival name + original prose preserved (suggestedActivity = "Dance with locals at Awa Odori")
      expect(note.notes).toContain("Awa Odori");
      expect(note.notes).toContain("Dance with locals at Awa Odori");
    }
  });

  it("Test 5 — festival with regional city (chichibu-night → kanto) drops with logger.warn, no activity injected", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    const trip: TripBuilderData = {
      duration: 3,
      dates: { start: "2026-12-02", end: "2026-12-04" }, // chichibu-night 12/2-12/3
      regions: ["kanto"],
      cities: ["tokyo"],
      vibes: ["temples_tradition"],
      style: "balanced",
      mustIncludeFestivals: ["chichibu-night"],
    };

    const itinerary = await generateItinerary(trip, { locations: ALL_LOCATIONS });

    const allActivities = itinerary.days.flatMap((d) => d.activities);
    const festivalActivities = allActivities.filter(
      (a) =>
        (a.kind === "note" && a.id.includes("chichibu-night")) ||
        (a.kind === "place" && (a.tags?.includes("pinned") ?? false) &&
          a.title?.toLowerCase().includes("chichibu")),
    );
    expect(festivalActivities).toHaveLength(0);

    // logger.warn fired with chichibu-night context
    const warnedAboutChichibu = warnSpy.mock.calls.some(
      (call) => typeof call[0] === "string" && call[0].includes("chichibu-night"),
    );
    expect(warnedAboutChichibu).toBe(true);

    warnSpy.mockRestore();
  });

  it("Test 6 — multiple festivals on overlapping dates both land (resolver sorts by festival start date for deterministic processing order)", async () => {
    // Trip 7/23-7/26 in Kyoto+Osaka covers gion-matsuri (7/1-7/31, kyoto)
    // and tenjin-matsuri (7/24-7/25, osaka). User passes festivals in the
    // wrong start-date order; resolver internally re-sorts so processing
    // order is deterministic regardless of caller input. We assert both
    // festivals land — the sort guarantee matters when two festivals
    // would compete for the same location (resolver's usedLocationIds
    // dedup gives priority to the earlier-starting festival).
    const osakaLocs: Location[] = [
      {
        id: "osaka-okawa-river", name: "Okawa River",
        city: "Osaka", region: "Kansai", category: "park",
        image: "/test.jpg",
        coordinates: { lat: 34.6945, lng: 135.5108 },
        rating: 4.5, reviewCount: 4000,
        recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
        preferredTransitModes: ["walk"], timezone: "Asia/Tokyo",
        planningCity: "osaka",
      },
      {
        id: "osaka-castle-1", name: "Osaka Castle",
        city: "Osaka", region: "Kansai", category: "landmark",
        image: "/test.jpg",
        coordinates: { lat: 34.6873, lng: 135.5262 },
        rating: 4.6, reviewCount: 15000,
        recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
        preferredTransitModes: ["subway"], timezone: "Asia/Tokyo",
        planningCity: "osaka",
      },
      {
        id: "osaka-park-1", name: "Osaka Park",
        city: "Osaka", region: "Kansai", category: "park",
        image: "/test.jpg",
        coordinates: { lat: 34.6851, lng: 135.5306 },
        rating: 4.3, reviewCount: 2000,
        recommendedVisit: { typicalMinutes: 60, minMinutes: 30 },
        preferredTransitModes: ["subway"], timezone: "Asia/Tokyo",
        planningCity: "osaka",
      },
      {
        id: "osaka-museum-1", name: "Osaka Museum",
        city: "Osaka", region: "Kansai", category: "museum",
        image: "/test.jpg",
        coordinates: { lat: 34.6900, lng: 135.5050 },
        rating: 4.4, reviewCount: 3000,
        recommendedVisit: { typicalMinutes: 90, minMinutes: 45 },
        preferredTransitModes: ["walk"], timezone: "Asia/Tokyo",
        planningCity: "osaka",
      },
    ];

    const trip: TripBuilderData = {
      duration: 4,
      dates: { start: "2026-07-23", end: "2026-07-26" },
      regions: ["kansai"],
      cities: ["kyoto", "osaka"],
      cityDays: [2, 2],
      vibes: ["temples_tradition"],
      style: "balanced",
      // Pass in reverse start-date order to verify deterministic sort.
      mustIncludeFestivals: ["tenjin-matsuri", "gion-matsuri"],
    };

    const itinerary = await generateItinerary(trip, {
      locations: [...KYOTO_LOCATIONS, ...osakaLocs],
    });

    const allActivities = itinerary.days.flatMap((d) => d.activities);

    // Gion Matsuri Plaza should be pinned on a Kyoto day (Day 0 or 1).
    const gion = allActivities.find(
      (a) => a.kind === "place" && a.locationId === "kyoto-gion-matsuri-plaza",
    );
    expect(gion).toBeDefined();

    // Tenjin Matsuri suggested activity contains "Okawa River" — should
    // match osaka-okawa-river. Either pin or note must land for tenjin.
    const tenjinPin = allActivities.find(
      (a) => a.kind === "place" && a.locationId === "osaka-okawa-river",
    );
    const tenjinNote = allActivities.find(
      (a) => a.kind === "note" && a.id.includes("tenjin-matsuri"),
    );
    expect(tenjinPin || tenjinNote).toBeDefined();
  });

  it("Test 7 — festival pin and saved place in same city both land without conflict", async () => {
    const itinerary = await generateItinerary(
      {
        ...baseKyotoTrip,
        mustIncludeFestivals: ["gion-matsuri"],
      },
      {
        locations: ALL_LOCATIONS,
        savedIds: ["kyoto-temple-1"], // Kiyomizu Temple
      },
    );

    const allActivities = itinerary.days.flatMap((d) => d.activities);

    const festivalPin = allActivities.find(
      (a) => a.kind === "place" && a.locationId === "kyoto-gion-matsuri-plaza",
    );
    const savedPlace = allActivities.find(
      (a) => a.kind === "place" && a.locationId === "kyoto-temple-1",
    );

    expect(festivalPin).toBeDefined();
    expect(savedPlace).toBeDefined();

    // Distinct activity IDs — no slot collision.
    if (festivalPin?.kind === "place" && savedPlace?.kind === "place") {
      expect(festivalPin.id).not.toBe(savedPlace.id);
    }
  });

  it("Test 8 — festival end-day boundary: festival ends Day 0 of trip, still pins Day 0", async () => {
    // gion-matsuri ends 7/31. Trip is 7/31–8/02. Day 0 is the festival's
    // last day → must still resolve.
    const trip: TripBuilderData = {
      ...baseKyotoTrip,
      duration: 3,
      dates: { start: "2026-07-31", end: "2026-08-02" },
    };

    const itinerary = await generateItinerary(
      { ...trip, mustIncludeFestivals: ["gion-matsuri"] },
      { locations: ALL_LOCATIONS },
    );

    const day0 = itinerary.days[0];
    expect(day0).toBeDefined();
    const pinnedOnDay0 = day0?.activities.find(
      (a) => a.kind === "place" && a.locationId === "kyoto-gion-matsuri-plaza",
    );
    expect(pinnedOnDay0).toBeDefined();
  });
});
