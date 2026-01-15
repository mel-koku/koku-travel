import type { Location } from "@/types/location";
import type { AvailabilityInfo } from "@/types/availability";
import { fetchLocationDetails } from "@/lib/googlePlaces";
import { logger } from "@/lib/logger";
import { featureFlags } from "@/lib/env/featureFlags";

/**
 * Check real-time availability for a location
 * Uses Google Places API to check current opening hours and status
 */
export async function checkAvailability(
  location: Location,
  options?: {
    /**
     * Whether to use cached data (default: true)
     */
    useCache?: boolean;
  },
): Promise<AvailabilityInfo> {
  const _useCache = options?.useCache ?? true;
  void _useCache; // Intentionally unused - kept for future use

  // If no placeId, return unknown status
  if (!location.placeId) {
    return {
      status: "unknown",
      message: "No place ID available for availability check",
      checkedAt: new Date().toISOString(),
    };
  }

  // Check if Google Places API is enabled
  if (!featureFlags.enableGooglePlaces) {
    // Fallback: check operating hours from location data
    return checkAvailabilityFromOperatingHours(location);
  }

  try {
    // Fetch location details (may use cache)
    const details = await fetchLocationDetails(location);

    // Check current opening hours
    if (details.currentOpeningHours && details.currentOpeningHours.length > 0) {
      // Parse the current opening hours to determine status
      // Format: "Monday: 9:00 AM – 5:00 PM" or "Open now" / "Closed"
      const currentHours = details.currentOpeningHours[0] ?? "";

      if (currentHours.toLowerCase().includes("open now")) {
        // Check if it's busy (we can infer from rating/reviews or use a heuristic)
        const busyLevel = estimateBusyLevel(details);
        
        return {
          status: busyLevel > 70 ? "busy" : "open",
          message: busyLevel > 70 
            ? "Currently open but may be busy" 
            : "Currently open",
          checkedAt: new Date().toISOString(),
          busyLevel: busyLevel > 70 ? busyLevel : undefined,
        };
      }

      if (currentHours.toLowerCase().includes("closed")) {
        return {
          status: "closed",
          message: "Currently closed",
          checkedAt: new Date().toISOString(),
        };
      }

      // Parse hours to check if we're within operating hours
      const isOpen = parseOperatingHours(currentHours);
      if (isOpen === null) {
        // Couldn't parse, check regular opening hours
        return checkAvailabilityFromOperatingHours(location, details);
      }

      return {
        status: isOpen ? "open" : "closed",
        message: isOpen ? "Currently open" : "Currently closed",
        checkedAt: new Date().toISOString(),
      };
    }

    // Fallback to regular opening hours
    return checkAvailabilityFromOperatingHours(location, details);
  } catch (error) {
    logger.warn("Failed to check availability from Google Places", {
      locationId: location.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to operating hours check
    return checkAvailabilityFromOperatingHours(location);
  }
}

/**
 * Check availability from location's operating hours data
 */
function checkAvailabilityFromOperatingHours(
  location: Location,
  _details?: { regularOpeningHours?: string[] },
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
 * Estimate busy level based on rating and review count
 */
function estimateBusyLevel(details: { rating?: number; userRatingCount?: number }): number {
  // Simple heuristic: higher rating + more reviews = potentially busier
  const rating = details.rating ?? 0;
  const reviewCount = details.userRatingCount ?? 0;

  // Base busy level from rating (4.5+ = very popular = busy)
  let busyLevel = 0;
  if (rating >= 4.5) {
    busyLevel += 40;
  } else if (rating >= 4.0) {
    busyLevel += 25;
  } else if (rating >= 3.5) {
    busyLevel += 15;
  }

  // Add from review count (more reviews = more popular)
  if (reviewCount > 1000) {
    busyLevel += 40;
  } else if (reviewCount > 500) {
    busyLevel += 25;
  } else if (reviewCount > 100) {
    busyLevel += 15;
  }

  return Math.min(100, busyLevel);
}

/**
 * Parse operating hours string to determine if currently open
 */
function parseOperatingHours(hoursString: string): boolean | null {
  // Try to parse formats like "Monday: 9:00 AM – 5:00 PM"
  const timeMatch = hoursString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*–\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!timeMatch) {
    return null;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const openHour = parseInt(timeMatch[1] ?? "0", 10);
  const openMinute = parseInt(timeMatch[2] ?? "0", 10);
  const openPeriod = (timeMatch[3] ?? "").toUpperCase();
  const closeHour = parseInt(timeMatch[4] ?? "0", 10);
  const closeMinute = parseInt(timeMatch[5] ?? "0", 10);
  const closePeriod = (timeMatch[6] ?? "").toUpperCase();

  let openTimeMinutes = openHour * 60 + openMinute;
  if (openPeriod === "PM" && openHour !== 12) {
    openTimeMinutes += 12 * 60;
  }
  if (openPeriod === "AM" && openHour === 12) {
    openTimeMinutes -= 12 * 60;
  }

  let closeTimeMinutes = closeHour * 60 + closeMinute;
  if (closePeriod === "PM" && closeHour !== 12) {
    closeTimeMinutes += 12 * 60;
  }
  if (closePeriod === "AM" && closeHour === 12) {
    closeTimeMinutes -= 12 * 60;
  }

  return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
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

