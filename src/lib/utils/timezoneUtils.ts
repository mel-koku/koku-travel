/**
 * Timezone utilities for itinerary planning.
 *
 * Provides a consistent timezone fallback hierarchy:
 * 1. Day-level timezone (most specific)
 * 2. Itinerary-level timezone
 * 3. Location timezone (from location data)
 * 4. Location operating hours timezone
 * 5. Japan Standard Time (Asia/Tokyo) - default for Japan travel app
 */

import type { Location } from "@/types/location";

/**
 * Default timezone for Japan (used as final fallback)
 */
export const JAPAN_TIMEZONE = "Asia/Tokyo";

/**
 * Resolves the timezone for a given context using the fallback hierarchy.
 *
 * Fallback order:
 * 1. dayTimezone - Most specific, set at day level
 * 2. itineraryTimezone - Set at itinerary level
 * 3. location.timezone - From location data
 * 4. location.operatingHours.timezone - From operating hours
 * 5. JAPAN_TIMEZONE (Asia/Tokyo) - Default for Japan travel app
 *
 * @param options - Timezone resolution options
 * @returns The resolved timezone string
 */
export function resolveTimezone(options: {
  dayTimezone?: string;
  itineraryTimezone?: string;
  location?: Location | null;
}): string {
  const { dayTimezone, itineraryTimezone, location } = options;

  // Priority 1: Day-level timezone (most specific)
  if (dayTimezone) {
    return dayTimezone;
  }

  // Priority 2: Itinerary-level timezone
  if (itineraryTimezone) {
    return itineraryTimezone;
  }

  // Priority 3: Location timezone (from location data)
  if (location?.timezone) {
    return location.timezone;
  }

  // Priority 4: Location operating hours timezone
  if (location?.operatingHours?.timezone) {
    return location.operatingHours.timezone;
  }

  // Priority 5: Default to Japan Standard Time
  return JAPAN_TIMEZONE;
}

/**
 * Validates if a timezone string is a valid IANA timezone identifier.
 *
 * @param timezone - The timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a timezone string, returning undefined if invalid.
 *
 * @param timezone - The timezone string to normalize
 * @returns The normalized timezone or undefined if invalid
 */
export function normalizeTimezone(timezone: string | undefined | null): string | undefined {
  if (!timezone) {
    return undefined;
  }

  // Common timezone aliases for Japan
  const aliases: Record<string, string> = {
    "JST": JAPAN_TIMEZONE,
    "Japan": JAPAN_TIMEZONE,
    "Japan Standard Time": JAPAN_TIMEZONE,
    "UTC+9": JAPAN_TIMEZONE,
    "+09:00": JAPAN_TIMEZONE,
  };

  const normalized = aliases[timezone] ?? timezone;

  return isValidTimezone(normalized) ? normalized : undefined;
}
