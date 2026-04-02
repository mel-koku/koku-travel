import { REGIONS } from "@/data/regions";
import { parseLocalDateWithOffset } from "@/lib/utils/dateUtils";

/**
 * Format a city ID to a display name using the REGIONS data.
 * Falls back to capitalizing the ID.
 */
export function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

/**
 * Build a canonical day label used across the itinerary UI.
 *
 * Format: "Apr 2 · Osaka" (with date) or "Osaka" (without date) or "Day 1" (fallback).
 *
 * This is the single source of truth for how days are labeled in the
 * timeline header, overview tabs, tips sections, and smart prompt badges.
 */
export function buildDayLabel(
  dayIndex: number,
  opts: {
    tripStartDate?: string;
    cityId?: string;
  } = {},
): string {
  const { tripStartDate, cityId } = opts;

  const datePart = tripStartDate
    ? (() => {
        const date = parseLocalDateWithOffset(tripStartDate, dayIndex);
        return date ? monthDayFormatter.format(date) : null;
      })()
    : null;

  const cityPart = cityId ? formatCityName(cityId) : null;

  if (datePart && cityPart) return `${datePart} \u00B7 ${cityPart}`;
  if (datePart) return datePart;
  if (cityPart) return cityPart;
  return `Day ${dayIndex + 1}`;
}
