import type { Location } from "@/types/location";
import type { AvailabilityInfo } from "@/types/availability";

/**
 * Check availability for a location using pre-enriched database data
 * No longer calls Google Places API - uses operating hours stored in database
 */
export async function checkAvailability(
  location: Location,
): Promise<AvailabilityInfo> {
  // Use operating hours from location data (pre-enriched in database)
  return checkAvailabilityFromOperatingHours(location);
}

/**
 * Check availability from location's operating hours data (from database)
 */
function checkAvailabilityFromOperatingHours(
  location: Location,
): AvailabilityInfo {
  const operatingHours = location.operatingHours;
  
  if (!operatingHours || !operatingHours.periods || operatingHours.periods.length === 0) {
    return {
      status: "unknown",
      message: "No operating hours information available",
      checkedAt: new Date().toISOString(),
    };
  }

  const now = new Date();
  const currentDay = getCurrentWeekday(now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Find period for current day
  const todayPeriod = operatingHours.periods.find((p) => p.day === currentDay);

  if (!todayPeriod) {
    return {
      status: "closed",
      message: "Closed today",
      checkedAt: new Date().toISOString(),
    };
  }

  // Parse opening and closing times
  const openTime = parseTimeString(todayPeriod.open);
  const closeTime = parseTimeString(todayPeriod.close);

  if (openTime === null || closeTime === null) {
    return {
      status: "unknown",
      message: "Could not parse operating hours",
      checkedAt: new Date().toISOString(),
    };
  }

  let closeTimeMinutes = closeTime;
  if (todayPeriod.isOvernight) {
    closeTimeMinutes += 24 * 60; // Add 24 hours
  }

  const isOpen = currentTimeMinutes >= openTime && currentTimeMinutes <= closeTimeMinutes;

  return {
    status: isOpen ? "open" : "closed",
    message: isOpen ? "Currently open" : "Currently closed",
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Parse time string (HH:MM format) to minutes since midnight
 */
function parseTimeString(timeStr: string): number | null {
  const parts = timeStr.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Get current weekday in lowercase
 */
function getCurrentWeekday(date: Date): string {
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return weekdays[date.getDay()] ?? "monday";
}

/**
 * Check if a location typically requires reservations
 * Based on category and other factors
 */
export function checkReservationRequirement(location: Location): boolean {
  // Categories that typically require reservations
  const reservationCategories = [
    "restaurant",
    "fine_dining",
    "theater",
    "museum",
    "attraction",
  ];

  const category = location.category?.toLowerCase() ?? "";
  
  // Fine dining restaurants almost always need reservations
  if (category.includes("fine_dining") || category.includes("restaurant")) {
    // Check rating - higher rated restaurants more likely to need reservations
    if (location.rating && location.rating >= 4.5) {
      return true;
    }
  }

  return reservationCategories.some((cat) => category.includes(cat));
}

