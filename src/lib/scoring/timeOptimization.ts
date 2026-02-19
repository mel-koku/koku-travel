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

const MINUTES_IN_DAY = 24 * 60;

function parseTimeToMinutes(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return hours * 60 + minutes;
}

/**
 * Check if location has opening hours that allow a meaningful visit in the time slot.
 *
 * Uses minute-level overlap to ensure the location is open long enough
 * for at least `minVisitMinutes` (default 30) within the slot.
 */
export function checkOpeningHoursFit(
  location: Location,
  timeSlot: "morning" | "afternoon" | "evening",
  date?: string, // ISO date string for weekday calculation
  minVisitMinutes = 30,
): { fits: boolean; reasoning: string } {
  const operatingHours = location.operatingHours;
  if (!operatingHours || !operatingHours.periods || operatingHours.periods.length === 0) {
    return {
      fits: true,
      reasoning: "No opening hours information available",
    };
  }

  // Map time slot to minute ranges
  const timeSlotRanges: Record<"morning" | "afternoon" | "evening", { start: number; end: number }> = {
    morning: { start: 9 * 60, end: 12 * 60 },
    afternoon: { start: 12 * 60, end: 17 * 60 },
    evening: { start: 17 * 60, end: 21 * 60 },
  };

  const slotRange = timeSlotRanges[timeSlot];
  if (!slotRange) {
    return {
      fits: true,
      reasoning: "Invalid time slot",
    };
  }

  // Get weekday if date provided (parse locally to avoid UTC drift)
  let weekday: string | undefined;
  if (date) {
    const parts = date.split("-");
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    weekday = weekdays[dateObj.getDay()];
  }

  // Check if any operating period allows a meaningful visit during the slot
  for (const period of operatingHours.periods) {
    // If weekday specified and period has a specific day, check if they match.
    // Periods without a day (generic "open every day") always match.
    if (weekday && period.day && period.day !== weekday) {
      continue;
    }

    const openMinutes = parseTimeToMinutes(period.open);
    let closeMinutes = parseTimeToMinutes(period.close);

    // Handle overnight periods
    if (period.isOvernight) {
      closeMinutes += MINUTES_IN_DAY;
    }

    // Compute actual overlap in minutes
    const overlapStart = Math.max(slotRange.start, openMinutes);
    const overlapEnd = Math.min(slotRange.end, closeMinutes);
    const overlapMinutes = Math.max(0, overlapEnd - overlapStart);

    if (overlapMinutes >= minVisitMinutes) {
      return {
        fits: true,
        reasoning: `Open during ${timeSlot} (${period.open}-${period.close}, ${overlapMinutes}min available)`,
      };
    }
  }

  // No matching period found with enough visit time
  return {
    fits: false,
    reasoning: `Insufficient opening hours during ${timeSlot} (need ${minVisitMinutes}min)`,
  };
}

