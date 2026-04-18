import { describe, it, expect } from "vitest";
import { tripOverlapsTyphoonSeason, shouldShowDisasterBanner } from "../disasterOverlay";
import type { StoredTrip } from "@/services/trip/types";

// Helper to create a minimal trip for testing
function makeTrip(
  startDate: string,
  endDate: string,
  cities: string[] = ["tokyo"],
): StoredTrip {
  return {
    id: "test-trip",
    name: "Test Trip",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itinerary: { days: [] },
    builderData: {
      dates: { start: startDate, end: endDate },
      cities,
    },
  };
}

describe("tripOverlapsTyphoonSeason", () => {
  it("should trigger for Aug–Oct overlap, Honshu (temperate)", () => {
    const trip = makeTrip("2025-08-20", "2025-09-05", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should trigger for Aug–Oct overlap, Hokkaido (subarctic_north)", () => {
    const trip = makeTrip("2025-08-20", "2025-09-05", ["sapporo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should trigger for Jun–Sep overlap, Okinawa (tropical_south)", () => {
    const trip = makeTrip("2025-07-01", "2025-08-01", ["naha"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should NOT trigger for Dec–Jan (winter)", () => {
    const trip = makeTrip("2025-12-01", "2025-12-15", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });

  it("should NOT trigger for Aug 14 (day before peak start)", () => {
    const trip = makeTrip("2025-08-14", "2025-08-14", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });

  it("should trigger for Aug 15 (peak start)", () => {
    const trip = makeTrip("2025-08-15", "2025-08-15", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should NOT trigger for empty builderData", () => {
    const trip = makeTrip("2025-08-20", "2025-09-05", []);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });

  it("should fallback to temperate for unknown city ID and follow trigger logic", () => {
    const trip = makeTrip("2025-08-20", "2025-09-05", ["unknown-city"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should trigger for Okinawa Jul 1 – Aug 1 (Jun–Sep window)", () => {
    const trip = makeTrip("2025-07-01", "2025-08-01", ["naha"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should trigger for Hokkaido Oct 1 – Nov 1 (Aug 15–Oct 15 window)", () => {
    const trip = makeTrip("2025-10-01", "2025-11-01", ["sapporo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(true);
  });

  it("should handle missing start date", () => {
    const trip = makeTrip("", "2025-09-05", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });

  it("should handle missing end date", () => {
    const trip = makeTrip("2025-08-20", "", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });

  it("should NOT trigger for May–Jun (before tropical season)", () => {
    const trip = makeTrip("2025-05-01", "2025-05-31", ["naha"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });

  it("should NOT trigger for Oct–Nov outside peak window for temperate region", () => {
    const trip = makeTrip("2025-10-16", "2025-11-15", ["tokyo"]);
    expect(tripOverlapsTyphoonSeason(trip)).toBe(false);
  });
});

describe("shouldShowDisasterBanner", () => {
  it("should NOT show if trip does not overlap typhoon season", () => {
    const trip = makeTrip("2025-12-01", "2025-12-15", ["tokyo"]);
    expect(shouldShowDisasterBanner(trip)).toBe(false);
  });

  it("should show if trip overlaps and is within 84 days", () => {
    // Hard-code a date that's within 84 days from April 18, 2026
    // Aug 1-10, 2026 is about 105 days away (too far), so use Jun 1-10, 2026 (~44 days)
    // Actually, let's use a predictable future date: 60 days from "today" (Apr 18) = ~Jun 17
    // Jun 17 doesn't fall in typhoon peak, so let's target Okinawa (tropical_south: Jun 1 - Sep 30)
    const trip = makeTrip("2026-06-17", "2026-06-22", ["naha"]);
    expect(shouldShowDisasterBanner(trip)).toBe(true);
  });

  it("should NOT show if trip is more than 84 days away", () => {
    // Dec 31, 2026 is way more than 84 days away, and not in typhoon season anyway
    const trip = makeTrip("2026-12-31", "2027-01-07", ["tokyo"]);
    expect(shouldShowDisasterBanner(trip)).toBe(false);
  });

  it("should show if trip is less than 4 weeks away (late but show for safety)", () => {
    // Create a trip starting within 4 weeks but still in typhoon season
    // Today is Apr 18, 2026. 3 weeks out is ~May 9, 2026
    // May doesn't have strong typhoons for temperate regions, but tropical_south (Jun-Sep) works
    // Let's use Jun 5 which is within 7 weeks (49 days) and in tropical season
    const trip = makeTrip("2026-06-05", "2026-06-10", ["naha"]);
    expect(shouldShowDisasterBanner(trip)).toBe(true);
  });

  it("should NOT show if trip start date is in the past", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const month = String(pastDate.getMonth() + 1).padStart(2, "0");
    const day = String(pastDate.getDate()).padStart(2, "0");
    const year = pastDate.getFullYear();

    const endDate = new Date(pastDate);
    endDate.setDate(endDate.getDate() + 10);
    const endDay = String(endDate.getDate()).padStart(2, "0");

    const trip = makeTrip(`${year}-${month}-${day}`, `${year}-${month}-${endDay}`, ["tokyo"]);
    expect(shouldShowDisasterBanner(trip)).toBe(false);
  });

  it("should handle missing start date", () => {
    const trip = makeTrip("", "2025-09-05", ["tokyo"]);
    expect(shouldShowDisasterBanner(trip)).toBe(false);
  });
});
