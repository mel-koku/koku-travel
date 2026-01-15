import type { Location } from "@/types/location";

/**
 * Optimal time of day for different location categories
 */
const OPTIMAL_TIMES_BY_CATEGORY: Record<string, Array<"morning" | "afternoon" | "evening">> = {
  viewpoint: ["morning", "evening"], // Best at sunrise/sunset
  park: ["morning", "afternoon"], // Less crowded in morning
  garden: ["morning", "afternoon"], // Best lighting
  shrine: ["morning", "evening"], // Less crowded, peaceful
  temple: ["morning", "evening"], // Less crowded, peaceful
  restaurant: ["afternoon", "evening"], // Meal times
  market: ["morning", "afternoon"], // Fresh produce, less crowded
  museum: ["afternoon"], // Indoor, good for afternoon
  shopping: ["afternoon", "evening"], // Afternoon/evening shopping
  bar: ["evening"], // Evening/nightlife
  entertainment: ["evening"], // Evening entertainment
  landmark: ["morning", "afternoon"], // Better lighting, less crowds
  historic: ["morning", "afternoon"], // Better visibility
};

/**
 * Score adjustment based on time-of-day optimization
 * Returns a score adjustment (-5 to +10) based on how well the time slot matches optimal times
 */
export function scoreTimeOfDayFit(
  location: Location,
  timeSlot: "morning" | "afternoon" | "evening",
  _date?: string, // ISO date string (yyyy-mm-dd) for weekday calculation
): { scoreAdjustment: number; reasoning: string } {
  const category = location.category?.toLowerCase() ?? "";
  const optimalTimes = OPTIMAL_TIMES_BY_CATEGORY[category];

  if (!optimalTimes || optimalTimes.length === 0) {
    return {
      scoreAdjustment: 0,
      reasoning: "No specific time preference for this category",
    };
  }

  // Perfect match gets highest score
  if (optimalTimes.includes(timeSlot)) {
    return {
      scoreAdjustment: 8,
      reasoning: `${timeSlot} is an optimal time to visit ${category} (less crowded, better experience)`,
    };
  }

  // Check if it's close to optimal (e.g., afternoon when morning/evening are optimal)
  // This gives a small boost for adjacent time slots
  const timeSlots: Array<"morning" | "afternoon" | "evening"> = ["morning", "afternoon", "evening"];
  const currentIndex = timeSlots.indexOf(timeSlot);
  const hasAdjacentOptimal = optimalTimes.some((optimal) => {
    const optimalIndex = timeSlots.indexOf(optimal);
    return Math.abs(currentIndex - optimalIndex) === 1;
  });

  if (hasAdjacentOptimal) {
    return {
      scoreAdjustment: 3,
      reasoning: `${timeSlot} is acceptable for ${category}, though ${optimalTimes.join(" or ")} would be better`,
    };
  }

  // Not optimal - small penalty
  return {
    scoreAdjustment: -3,
    reasoning: `${timeSlot} is not ideal for ${category} (optimal times: ${optimalTimes.join(", ")})`,
  };
}

/**
 * Check if location has opening hours that conflict with the time slot
 */
export function checkOpeningHoursFit(
  location: Location,
  timeSlot: "morning" | "afternoon" | "evening",
  date?: string, // ISO date string for weekday calculation
): { fits: boolean; reasoning: string } {
  const operatingHours = location.operatingHours;
  if (!operatingHours || !operatingHours.periods || operatingHours.periods.length === 0) {
    return {
      fits: true,
      reasoning: "No opening hours information available",
    };
  }

  // Map time slot to hour range
  const timeSlotRanges: Record<"morning" | "afternoon" | "evening", { start: number; end: number }> = {
    morning: { start: 9, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 21 },
  };

  const slotRange = timeSlotRanges[timeSlot];
  if (!slotRange) {
    return {
      fits: true,
      reasoning: "Invalid time slot",
    };
  }

  // Get weekday if date provided
  let weekday: string | undefined;
  if (date) {
    const dateObj = new Date(date);
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    weekday = weekdays[dateObj.getDay()];
  }

  // Check if any operating period covers the time slot
  for (const period of operatingHours.periods) {
    // If weekday specified, check if period matches
    if (weekday && period.day !== weekday) {
      continue;
    }

    const openHour = parseInt(period.open.split(":")[0] ?? "0", 10);
    let closeHour = parseInt(period.close.split(":")[0] ?? "24", 10);
    
    // Handle overnight periods
    if (period.isOvernight) {
      closeHour += 24;
    }

    // Check if time slot overlaps with operating hours
    // Two ranges overlap if: range1.start < range2.end && range1.end > range2.start
    // Time slot overlaps operating hours if: slotStart < closeHour && slotEnd > openHour
    if (slotRange.start < closeHour && slotRange.end > openHour) {
      return {
        fits: true,
        reasoning: `Open during ${timeSlot} (${period.open}-${period.close})`,
      };
    }
  }

  // No matching period found
  return {
    fits: false,
    reasoning: `May not be open during ${timeSlot} based on operating hours`,
  };
}

