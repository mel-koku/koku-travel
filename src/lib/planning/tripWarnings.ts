/**
 * Trip Warning Detection System
 *
 * Analyzes trip builder data and generates proactive warnings to help users
 * plan better trips. Warnings are informational (non-blocking) and provide
 * helpful context about potential issues or opportunities.
 */

import type { TripBuilderData, RegionId } from "@/types/trip";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { calculateDistance } from "@/lib/utils/geoUtils";

/**
 * Warning severity levels
 */
export type WarningSeverity = "info" | "warning" | "caution";

/**
 * Warning types for categorization
 */
export type WarningType =
  | "pacing"
  | "seasonal_rainy"
  | "seasonal_cherry_blossom"
  | "seasonal_autumn"
  | "holiday"
  | "distance"
  | "weather";

/**
 * A single planning warning
 */
export type PlanningWarning = {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  title: string;
  message: string;
  icon: string;
};

/**
 * Japanese holiday periods that affect travel
 */
const HOLIDAY_PERIODS = [
  {
    name: "New Year",
    startMonth: 12,
    startDay: 28,
    endMonth: 1,
    endDay: 4,
    description: "Many businesses close, but shrines are especially vibrant for hatsumode (first shrine visit).",
  },
  {
    name: "Golden Week",
    startMonth: 4,
    startDay: 29,
    endMonth: 5,
    endDay: 5,
    description: "Expect larger crowds and higher prices at popular destinations. Book accommodations early.",
  },
  {
    name: "Obon",
    startMonth: 8,
    startDay: 13,
    endMonth: 8,
    endDay: 16,
    description: "Major travel period for Japanese families. Expect crowded trains and popular attractions.",
  },
  {
    name: "Silver Week",
    startMonth: 9,
    startDay: 19,
    endMonth: 9,
    endDay: 23,
    description: "A popular domestic travel period. Some destinations may be busier than usual.",
  },
];

/**
 * Seasonal periods with special considerations
 */
const SEASONAL_PERIODS = {
  rainy: {
    startMonth: 6,
    startDay: 1,
    endMonth: 7,
    endDay: 20,
    title: "Rainy Season (Tsuyu)",
    message: "You're traveling during rainy season. We'll prioritize indoor activities and suggest backup options for outdoor plans.",
  },
  cherryBlossom: {
    startMonth: 3,
    startDay: 20,
    endMonth: 4,
    endDay: 15,
    title: "Cherry Blossom Season",
    message: "Perfect timing for cherry blossoms (sakura)! We'll include the best hanami spots in your itinerary.",
  },
  autumnLeaves: {
    startMonth: 10,
    startDay: 15,
    endMonth: 11,
    endDay: 30,
    title: "Autumn Leaves Season",
    message: "Great timing for autumn colors (koyo)! We'll suggest gardens and temples famous for fall foliage.",
  },
  summer: {
    startMonth: 7,
    startDay: 21,
    endMonth: 8,
    endDay: 31,
    title: "Summer Heat",
    message: "Japanese summers can be hot and humid. We'll balance outdoor activities with air-conditioned spots and suggest early morning visits.",
  },
  winter: {
    startMonth: 12,
    startDay: 15,
    endMonth: 2,
    endDay: 28,
    title: "Winter Season",
    message: "Great time for onsen (hot springs) and winter illuminations! Some mountain areas may have limited access due to snow.",
  },
};

// calculateDistance imported from @/lib/utils/geoUtils

/**
 * Get region description by ID
 */
function getRegionCoordinates(regionId: RegionId): { lat: number; lng: number } | undefined {
  const region = REGION_DESCRIPTIONS.find((r) => r.id === regionId);
  return region?.coordinates;
}

/**
 * Check if a date falls within a period (handles year boundaries)
 */
function isDateInPeriod(
  date: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();

  // Handle periods that cross year boundary (e.g., Dec 28 - Jan 4)
  if (startMonth > endMonth) {
    // Check if in Dec portion or Jan portion
    if (month === startMonth && day >= startDay) return true;
    if (month > startMonth) return true;
    if (month === endMonth && day <= endDay) return true;
    if (month < endMonth) return true;
    return false;
  }

  // Normal period within same year
  if (month < startMonth || month > endMonth) return false;
  if (month === startMonth && day < startDay) return false;
  if (month === endMonth && day > endDay) return false;
  return true;
}

/**
 * Check if trip dates overlap with a period
 */
function tripOverlapsPeriod(
  startDate: Date,
  endDate: Date,
  periodStartMonth: number,
  periodStartDay: number,
  periodEndMonth: number,
  periodEndDay: number
): boolean {
  // Check each day of the trip
  const current = new Date(startDate);
  while (current <= endDate) {
    if (isDateInPeriod(current, periodStartMonth, periodStartDay, periodEndMonth, periodEndDay)) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }
  return false;
}

/**
 * Detect pacing issues (too many cities for trip duration)
 */
function detectPacingWarning(data: TripBuilderData): PlanningWarning | null {
  const cityCount = data.cities?.length ?? 0;
  const duration = data.duration ?? 0;

  if (cityCount === 0 || duration === 0) return null;

  // Thresholds for pacing warnings
  const citiesPerDay = cityCount / duration;

  if (duration <= 3 && cityCount >= 3) {
    return {
      id: "pacing-short-trip",
      type: "pacing",
      severity: "caution",
      title: "Ambitious Itinerary",
      message: `${cityCount} cities in ${duration} days is quite ambitious. Consider focusing on 1-2 cities for a more relaxed experience with time to explore each area thoroughly.`,
      icon: "⏱️",
    };
  }

  if (duration <= 5 && cityCount >= 5) {
    return {
      id: "pacing-moderate-trip",
      type: "pacing",
      severity: "warning",
      title: "Fast-Paced Trip",
      message: `${cityCount} cities in ${duration} days means lots of travel. Consider reducing to 3-4 cities to spend more quality time in each location.`,
      icon: "🚄",
    };
  }

  if (citiesPerDay > 0.8) {
    return {
      id: "pacing-general",
      type: "pacing",
      severity: "info",
      title: "Active Itinerary",
      message: `With ${cityCount} cities planned, you'll be moving frequently. This is fine if you enjoy a fast pace, but consider if you'd prefer deeper exploration of fewer places.`,
      icon: "📍",
    };
  }

  return null;
}

/**
 * Detect holiday period overlaps
 */
function detectHolidayWarnings(data: TripBuilderData): PlanningWarning[] {
  const warnings: PlanningWarning[] = [];

  if (!data.dates.start || !data.dates.end) return warnings;

  const startDate = new Date(data.dates.start);
  const endDate = new Date(data.dates.end);

  for (const holiday of HOLIDAY_PERIODS) {
    if (
      tripOverlapsPeriod(
        startDate,
        endDate,
        holiday.startMonth,
        holiday.startDay,
        holiday.endMonth,
        holiday.endDay
      )
    ) {
      warnings.push({
        id: `holiday-${holiday.name.toLowerCase().replace(/\s+/g, "-")}`,
        type: "holiday",
        severity: "warning",
        title: `${holiday.name} Travel Period`,
        message: holiday.description,
        icon: "🎌",
      });
    }
  }

  return warnings;
}

/**
 * Detect seasonal considerations
 */
function detectSeasonalWarnings(data: TripBuilderData): PlanningWarning[] {
  const warnings: PlanningWarning[] = [];

  if (!data.dates.start || !data.dates.end) return warnings;

  const startDate = new Date(data.dates.start);
  const endDate = new Date(data.dates.end);

  // Check rainy season
  if (
    tripOverlapsPeriod(
      startDate,
      endDate,
      SEASONAL_PERIODS.rainy.startMonth,
      SEASONAL_PERIODS.rainy.startDay,
      SEASONAL_PERIODS.rainy.endMonth,
      SEASONAL_PERIODS.rainy.endDay
    )
  ) {
    warnings.push({
      id: "seasonal-rainy",
      type: "seasonal_rainy",
      severity: "info",
      title: SEASONAL_PERIODS.rainy.title,
      message: SEASONAL_PERIODS.rainy.message,
      icon: "🌧️",
    });
  }

  // Check cherry blossom season (positive!)
  if (
    tripOverlapsPeriod(
      startDate,
      endDate,
      SEASONAL_PERIODS.cherryBlossom.startMonth,
      SEASONAL_PERIODS.cherryBlossom.startDay,
      SEASONAL_PERIODS.cherryBlossom.endMonth,
      SEASONAL_PERIODS.cherryBlossom.endDay
    )
  ) {
    warnings.push({
      id: "seasonal-cherry-blossom",
      type: "seasonal_cherry_blossom",
      severity: "info",
      title: SEASONAL_PERIODS.cherryBlossom.title,
      message: SEASONAL_PERIODS.cherryBlossom.message,
      icon: "🌸",
    });
  }

  // Check autumn leaves season (positive!)
  if (
    tripOverlapsPeriod(
      startDate,
      endDate,
      SEASONAL_PERIODS.autumnLeaves.startMonth,
      SEASONAL_PERIODS.autumnLeaves.startDay,
      SEASONAL_PERIODS.autumnLeaves.endMonth,
      SEASONAL_PERIODS.autumnLeaves.endDay
    )
  ) {
    warnings.push({
      id: "seasonal-autumn",
      type: "seasonal_autumn",
      severity: "info",
      title: SEASONAL_PERIODS.autumnLeaves.title,
      message: SEASONAL_PERIODS.autumnLeaves.message,
      icon: "🍁",
    });
  }

  // Check summer heat
  if (
    tripOverlapsPeriod(
      startDate,
      endDate,
      SEASONAL_PERIODS.summer.startMonth,
      SEASONAL_PERIODS.summer.startDay,
      SEASONAL_PERIODS.summer.endMonth,
      SEASONAL_PERIODS.summer.endDay
    )
  ) {
    warnings.push({
      id: "seasonal-summer",
      type: "weather",
      severity: "info",
      title: SEASONAL_PERIODS.summer.title,
      message: SEASONAL_PERIODS.summer.message,
      icon: "☀️",
    });
  }

  // Check winter
  if (
    tripOverlapsPeriod(
      startDate,
      endDate,
      SEASONAL_PERIODS.winter.startMonth,
      SEASONAL_PERIODS.winter.startDay,
      SEASONAL_PERIODS.winter.endMonth,
      SEASONAL_PERIODS.winter.endDay
    )
  ) {
    warnings.push({
      id: "seasonal-winter",
      type: "weather",
      severity: "info",
      title: SEASONAL_PERIODS.winter.title,
      message: SEASONAL_PERIODS.winter.message,
      icon: "❄️",
    });
  }

  return warnings;
}

/**
 * Detect distance-related warnings (regions far apart)
 */
function detectDistanceWarnings(data: TripBuilderData): PlanningWarning | null {
  const regions = data.regions ?? [];
  if (regions.length < 2) return null;

  // Get coordinates for all regions
  const regionCoords: { id: string; coords: { lat: number; lng: number } }[] = [];
  for (const regionId of regions) {
    const coords = getRegionCoordinates(regionId);
    if (coords) {
      regionCoords.push({ id: regionId, coords });
    }
  }

  if (regionCoords.length < 2) return null;

  // Find max distance between any two regions
  let maxDistance = 0;
  let farRegions: [string, string] | null = null;

  for (let i = 0; i < regionCoords.length; i++) {
    for (let j = i + 1; j < regionCoords.length; j++) {
      const regionA = regionCoords[i];
      const regionB = regionCoords[j];
      if (!regionA || !regionB) continue;

      const distance = calculateDistance(
        regionA.coords,
        regionB.coords,
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        farRegions = [regionA.id, regionB.id];
      }
    }
  }

  // Specific warning for Hokkaido + Kyushu/Okinawa
  const hasHokkaido = regions.includes("hokkaido");
  const hasSouthern = regions.includes("kyushu") || regions.includes("okinawa");

  if (hasHokkaido && hasSouthern) {
    return {
      id: "distance-extreme",
      type: "distance",
      severity: "warning",
      title: "Long Distance Between Regions",
      message: "Hokkaido and southern Japan (Kyushu/Okinawa) are over 2,000km apart. Consider domestic flights or focusing on one area to maximize your time.",
      icon: "✈️",
    };
  }

  // General distance warning for >800km
  if (maxDistance > 800 && farRegions) {
    const region1 = REGION_DESCRIPTIONS.find((r) => r.id === farRegions![0])?.name ?? farRegions[0];
    const region2 = REGION_DESCRIPTIONS.find((r) => r.id === farRegions![1])?.name ?? farRegions[1];

    return {
      id: "distance-far",
      type: "distance",
      severity: "caution",
      title: "Significant Travel Distance",
      message: `${region1} and ${region2} are about ${Math.round(maxDistance)}km apart. Plan for travel time between these regions, or consider a domestic flight.`,
      icon: "🗾",
    };
  }

  return null;
}

/**
 * Main function to detect all planning warnings
 */
export function detectPlanningWarnings(data: TripBuilderData): PlanningWarning[] {
  const warnings: PlanningWarning[] = [];

  // Detect pacing issues
  const pacingWarning = detectPacingWarning(data);
  if (pacingWarning) {
    warnings.push(pacingWarning);
  }

  // Detect distance issues
  const distanceWarning = detectDistanceWarnings(data);
  if (distanceWarning) {
    warnings.push(distanceWarning);
  }

  // Detect holiday overlaps
  const holidayWarnings = detectHolidayWarnings(data);
  warnings.push(...holidayWarnings);

  // Detect seasonal considerations
  const seasonalWarnings = detectSeasonalWarnings(data);
  warnings.push(...seasonalWarnings);

  return warnings;
}

/**
 * Get warnings summary for display
 */
export function getWarningsSummary(warnings: PlanningWarning[]): {
  total: number;
  cautions: number;
  warnings: number;
  info: number;
} {
  return {
    total: warnings.length,
    cautions: warnings.filter((w) => w.severity === "caution").length,
    warnings: warnings.filter((w) => w.severity === "warning").length,
    info: warnings.filter((w) => w.severity === "info").length,
  };
}
