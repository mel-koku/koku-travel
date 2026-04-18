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
import { getFestivalsForTrip } from "@/data/festivalCalendar";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { travelTimeFromEntryPoint, getNearestCityToEntryPoint } from "@/lib/travelTime";
import { getActiveHolidays } from "@/data/crowdPatterns";
import { getWeatherRegion, type WeatherRegion } from "@/data/regions";
import { getSeasonalPeriod, type SeasonName } from "@/data/seasonalPeriods";

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
  | "weather"
  | "festival"
  | "return_to_airport";

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
  action?: string;
  actionData?: Record<string, unknown>;
};

/**
 * Warning-specific copy for holidays. Dates and applicable-year gating live in
 * the canonical HOLIDAY_PERIODS in crowdPatterns.ts; this map only enriches
 * the user-facing description when shown as a planning warning.
 */
const HOLIDAY_WARNING_COPY: Record<string, string> = {
  "new-year": "Many businesses close, but shrines are especially vibrant for hatsumode (first shrine visit).",
  "golden-week": "Expect larger crowds and higher prices at popular destinations. Book accommodations early.",
  obon: "Major travel period for Japanese families. Expect crowded trains and popular attractions.",
  "silver-week": "A popular domestic travel period. Some destinations may be busier than usual.",
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
 * Derive the trip's primary climate region. If the trip spans multiple weather
 * regions, prefer the most specific non-temperate one — a Tokyo+Okinawa trip
 * should still get tropical_south warnings because Okinawa days need them.
 */
function getTripWeatherRegion(data: TripBuilderData): WeatherRegion {
  const cities = data.cities ?? [];
  const weatherRegions = new Set(cities.map((c) => getWeatherRegion(c)));
  if (weatherRegions.has("tropical_south")) return "tropical_south";
  if (weatherRegions.has("subarctic_north")) return "subarctic_north";
  return "temperate";
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
    // Months fully inside the wrapped range (e.g., Jan in a Nov-Feb span)
    if (month > startMonth || month < endMonth) return true;
    // Boundary months: check day
    if (month === startMonth && day >= startDay) return true;
    if (month === endMonth && day <= endDay) return true;
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
 * Detect pacing issues (too many cities for trip duration).
 * Returns multiple warnings when applicable: a primary pacing
 * warning plus optional Japan-specific travel nudges.
 */
function detectPacingWarnings(data: TripBuilderData): PlanningWarning[] {
  const warnings: PlanningWarning[] = [];
  const cityCount = data.cities?.length ?? 0;
  const duration = data.duration ?? 0;

  if (cityCount === 0 || duration === 0) return warnings;

  const daysPerCity = duration / cityCount;

  // Primary pacing warning (escalating severity)
  if (daysPerCity < 1.5 && cityCount >= 3) {
    warnings.push({
      id: "pacing-very-tight",
      type: "pacing",
      severity: "caution",
      title: "Very Tight Pacing",
      message: `${cityCount} cities in ${duration} days gives you roughly ${daysPerCity.toFixed(1)} days per city. Between shinkansen rides, hotel check-ins, and finding your bearings in each new place, most of your time will go to logistics. Consider cutting ${Math.ceil(cityCount - duration / 2)} ${Math.ceil(cityCount - duration / 2) === 1 ? "city" : "cities"} for a trip you'll actually enjoy.`,
      icon: "⏱️",
    });
  } else if (daysPerCity < 2 && cityCount >= 3) {
    warnings.push({
      id: "pacing-tight",
      type: "pacing",
      severity: "warning",
      title: "Fast-Paced Trip",
      message: `${cityCount} cities in ${duration} days is doable but brisk. Each city move costs 2-4 hours of travel plus settling in. You'll want to be strategic about what you prioritize in each stop.`,
      icon: "🚄",
    });
  } else if (daysPerCity < 2.5 && cityCount >= 4) {
    warnings.push({
      id: "pacing-moderate",
      type: "pacing",
      severity: "info",
      title: "Active Itinerary",
      message: `Your pacing is manageable but leaves limited downtime. Some of the best Japan moments come from unplanned wandering, so give yourself room to slow down if a place captures you.`,
      icon: "📍",
    });
  }

  // Japan-specific expert nudges

  // Luggage logistics warning: many city changes mean coin lockers,
  // crowded station platforms with bags, and missed connections
  if (cityCount >= 4 && daysPerCity < 2.5) {
    warnings.push({
      id: "luggage-logistics",
      type: "pacing",
      severity: "info",
      title: "Luggage Logistics",
      message: `Changing cities ${cityCount} times means hauling bags through stations each time. Consider using takkyubin (luggage forwarding) or picking a hub city and doing day trips from there.`,
      icon: "🧳",
    });
  }

  // Short trip depth nudge: for 1-3 day trips with 2 cities,
  // suggest focusing on one
  if (duration <= 3 && cityCount === 2) {
    warnings.push({
      id: "short-trip-depth",
      type: "pacing",
      severity: "info",
      title: "Short Trip Tip",
      message: `With just ${duration} days, one city explored well often beats two cities rushed. Consider picking your favorite and going deeper.`,
      icon: "💡",
    });
  }

  return warnings;
}

/**
 * Detect holiday period overlaps
 */
function detectHolidayWarnings(data: TripBuilderData): PlanningWarning[] {
  if (!data.dates.start || !data.dates.end) return [];

  const startDate = parseLocalDate(data.dates.start)!;
  const endDate = parseLocalDate(data.dates.end)!;

  const holidays = getActiveHolidays(
    startDate.getMonth() + 1,
    startDate.getDate(),
    endDate.getMonth() + 1,
    endDate.getDate(),
    startDate.getFullYear(),
  );

  return holidays.map((holiday) => ({
    id: `holiday-${holiday.id}`,
    type: "holiday" as const,
    severity: "warning" as const,
    title: `${holiday.name} Travel Period`,
    message: HOLIDAY_WARNING_COPY[holiday.id] ?? holiday.description,
    icon: "🎌",
  }));
}

/**
 * Detect seasonal considerations
 */
function detectSeasonalWarnings(data: TripBuilderData): PlanningWarning[] {
  if (!data.dates.start || !data.dates.end) return [];

  const startDate = parseLocalDate(data.dates.start)!;
  const endDate = parseLocalDate(data.dates.end)!;
  const weatherRegion = getTripWeatherRegion(data);

  const seasonsToCheck: Array<{
    season: SeasonName;
    id: string;
    type: PlanningWarning["type"];
    severity: PlanningWarning["severity"];
    icon: string;
  }> = [
    { season: "rainy", id: "seasonal-rainy", type: "seasonal_rainy", severity: "info", icon: "🌧️" },
    { season: "cherryBlossom", id: "seasonal-cherry-blossom", type: "seasonal_cherry_blossom", severity: "info", icon: "🌸" },
    { season: "autumnLeaves", id: "seasonal-autumn", type: "seasonal_autumn", severity: "info", icon: "🍁" },
    { season: "summer", id: "seasonal-summer", type: "weather", severity: "info", icon: "☀️" },
    { season: "winter", id: "seasonal-winter", type: "weather", severity: "info", icon: "❄️" },
  ];

  const warnings: PlanningWarning[] = [];

  for (const { season, id, type, severity, icon } of seasonsToCheck) {
    const period = getSeasonalPeriod(season, weatherRegion);
    if (!period) continue;
    if (
      tripOverlapsPeriod(
        startDate, endDate,
        period.startMonth, period.startDay, period.endMonth, period.endDay,
      )
    ) {
      warnings.push({
        id,
        type,
        severity,
        title: period.title,
        message: period.message,
        icon,
      });
    }
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
 * Detect when the last city is far from the departure airport.
 * Fires when travel time exceeds 120 minutes.
 */
function detectReturnToAirportWarning(data: TripBuilderData): PlanningWarning | null {
  const cities = data.cities ?? [];
  if (cities.length === 0) return null;

  // Resolve effective exit point: round-trip uses entryPoint, open-jaw uses exitPoint
  const effectiveExit = data.sameAsEntry !== false
    ? data.entryPoint
    : (data.exitPoint ?? data.entryPoint);

  if (!effectiveExit) return null;

  const lastCity = cities[cities.length - 1];
  if (!lastCity) return null;

  const travelMinutes = travelTimeFromEntryPoint(effectiveExit, lastCity);
  if (travelMinutes === undefined || travelMinutes <= 120) return null;

  const nearestCity = getNearestCityToEntryPoint(effectiveExit);
  if (!nearestCity || lastCity === nearestCity) return null;

  const nearestCityName = nearestCity.charAt(0).toUpperCase() + nearestCity.slice(1);
  const hours = Math.floor(travelMinutes / 60);
  const mins = travelMinutes % 60;
  const timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return {
    id: "return-to-airport",
    type: "return_to_airport",
    severity: "caution",
    title: "Long Trip to Your Departure Airport",
    message: `Your last city is ~${timeStr} from your departure airport. Consider adding a return day in ${nearestCityName} so you're not rushing on your final day.`,
    icon: "✈️",
    action: `Add return day in ${nearestCityName}`,
    actionData: {
      returnCityId: nearestCity,
      returnCityName: nearestCityName,
      travelMinutes,
    },
  };
}

/**
 * Main function to detect all planning warnings
 */
export function detectPlanningWarnings(data: TripBuilderData): PlanningWarning[] {
  const warnings: PlanningWarning[] = [];

  // Detect pacing issues
  const pacingWarnings = detectPacingWarnings(data);
  warnings.push(...pacingWarnings);

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

  // Detect festival overlaps
  const festivalWarnings = detectFestivalWarnings(data);
  warnings.push(...festivalWarnings);

  // Detect return-to-airport issue
  const returnWarning = detectReturnToAirportWarning(data);
  if (returnWarning) {
    warnings.push(returnWarning);
  }

  return warnings;
}

/**
 * Detect festivals overlapping with the trip dates in planned cities
 */
function detectFestivalWarnings(data: TripBuilderData): PlanningWarning[] {
  if (!data.dates?.start || !data.dates?.end) return [];

  const startParts = data.dates.start.split("-").map(Number);
  const endParts = data.dates.end.split("-").map(Number);
  if (!startParts[1] || !startParts[2] || !endParts[1] || !endParts[2]) return [];

  const festivals = getFestivalsForTrip(
    startParts[1], startParts[2],
    endParts[1], endParts[2]
  );

  // Filter to festivals in planned cities (or show all if no cities selected)
  const cities = data.cities ?? [];
  const relevant = cities.length > 0
    ? festivals.filter((f) => cities.includes(f.city as typeof cities[number]))
    : festivals;

  if (relevant.length === 0) return [];

  // Show up to 2 festival warnings
  return relevant.slice(0, 2).map((f) => ({
    id: `festival-${f.id}`,
    type: "festival" as const,
    severity: (f.crowdImpact >= 4 ? "caution" : "info") as WarningSeverity,
    title: `${f.name} (${f.nameJa})`,
    message: f.description,
    icon: "🎆",
  }));
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
