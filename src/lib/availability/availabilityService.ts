import type { Location, Weekday } from "@/types/location";
import type { AvailabilityInfo, AvailabilityStatus } from "@/types/availability";

/**
 * Result of batch availability check
 */
export type BatchAvailabilityResult = {
  activityId: string;
  locationId?: string;
  status: AvailabilityStatus;
  message: string;
  operatingHours?: {
    opensAt: string;
    closesAt: string;
  };
  reservationRequired?: boolean;
};

/**
 * Aggregated availability issues for a day
 */
export type DayAvailabilityIssues = {
  dayId: string;
  dayIndex: number;
  issues: BatchAvailabilityResult[];
  summary: {
    closed: number;
    busy: number;
    requiresReservation: number;
    total: number;
  };
};

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
 * Check availability for a location on a specific day and time
 */
export function checkAvailabilityForSchedule(
  location: Location,
  weekday: Weekday,
  arrivalTime?: string,
  _departureTime?: string,
): BatchAvailabilityResult {
  const operatingHours = location.operatingHours;

  if (!operatingHours || !operatingHours.periods || operatingHours.periods.length === 0) {
    return {
      activityId: "",
      locationId: location.id,
      status: "unknown",
      message: "No operating hours available",
    };
  }

  // Find period for the specified day
  const dayPeriod = operatingHours.periods.find((p) => p.day === weekday);

  if (!dayPeriod) {
    return {
      activityId: "",
      locationId: location.id,
      status: "closed",
      message: `Closed on ${weekday}`,
    };
  }

  // Parse times
  const openTime = parseTimeString(dayPeriod.open);
  const closeTime = parseTimeString(dayPeriod.close);
  const arrivalMinutes = arrivalTime ? parseTimeString(arrivalTime) : null;

  if (openTime === null || closeTime === null) {
    return {
      activityId: "",
      locationId: location.id,
      status: "unknown",
      message: "Could not parse operating hours",
    };
  }

  // Handle overnight closings
  let closeTimeMinutes = closeTime;
  if (dayPeriod.isOvernight) {
    closeTimeMinutes += 24 * 60;
  }

  // Check if arrival time is within operating hours
  if (arrivalMinutes !== null) {
    if (arrivalMinutes < openTime) {
      return {
        activityId: "",
        locationId: location.id,
        status: "closed",
        message: `Opens at ${dayPeriod.open}, but scheduled for ${arrivalTime}`,
        operatingHours: {
          opensAt: dayPeriod.open,
          closesAt: dayPeriod.close,
        },
      };
    }
    if (arrivalMinutes > closeTimeMinutes) {
      return {
        activityId: "",
        locationId: location.id,
        status: "closed",
        message: `Closes at ${dayPeriod.close}, but scheduled for ${arrivalTime}`,
        operatingHours: {
          opensAt: dayPeriod.open,
          closesAt: dayPeriod.close,
        },
      };
    }
  }

  // Check if reservation is recommended
  const reservationRequired = checkReservationRequirement(location);

  return {
    activityId: "",
    locationId: location.id,
    status: reservationRequired ? "requires_reservation" : "open",
    message: reservationRequired
      ? `Open ${dayPeriod.open}-${dayPeriod.close} (reservation recommended)`
      : `Open ${dayPeriod.open}-${dayPeriod.close}`,
    operatingHours: {
      opensAt: dayPeriod.open,
      closesAt: dayPeriod.close,
    },
    reservationRequired,
  };
}

/**
 * Aggregate availability issues for a day
 */
export function aggregateDayAvailabilityIssues(
  dayId: string,
  dayIndex: number,
  results: BatchAvailabilityResult[],
): DayAvailabilityIssues {
  const issues = results.filter(
    (r) => r.status === "closed" || r.status === "busy" || r.status === "requires_reservation"
  );

  return {
    dayId,
    dayIndex,
    issues,
    summary: {
      closed: issues.filter((i) => i.status === "closed").length,
      busy: issues.filter((i) => i.status === "busy").length,
      requiresReservation: issues.filter((i) => i.status === "requires_reservation").length,
      total: issues.length,
    },
  };
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

