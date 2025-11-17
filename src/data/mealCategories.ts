/**
 * Meal timing rules and categories for meal planning
 */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Meal timing windows in 24-hour format (HH:MM)
 */
export const MEAL_TIMING_WINDOWS: Record<MealType, { start: string; end: string }> = {
  breakfast: { start: "07:00", end: "09:00" },
  lunch: { start: "12:00", end: "14:00" },
  dinner: { start: "18:00", end: "21:00" },
  snack: { start: "10:00", end: "22:00" }, // Flexible snack window
};

/**
 * Check if a time falls within a meal window
 */
export function isWithinMealWindow(time: string, mealType: MealType): boolean {
  const window = MEAL_TIMING_WINDOWS[mealType];
  const timeParts = time.split(":");
  const startParts = window.start.split(":");
  const endParts = window.end.split(":");

  if (timeParts.length < 2 || startParts.length < 2 || endParts.length < 2) {
    return false;
  }

  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);
  const startHours = Number(startParts[0]);
  const startMinutes = Number(startParts[1]);
  const endHours = Number(endParts[0]);
  const endMinutes = Number(endParts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(startHours) || Number.isNaN(startMinutes) || Number.isNaN(endHours) || Number.isNaN(endMinutes)) {
    return false;
  }

  const timeMinutes = hours * 60 + minutes;
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  return timeMinutes >= startMinutesTotal && timeMinutes <= endMinutesTotal;
}

/**
 * Get the meal type for a given time
 */
export function getMealTypeForTime(time: string): MealType | null {
  if (isWithinMealWindow(time, "breakfast")) return "breakfast";
  if (isWithinMealWindow(time, "lunch")) return "lunch";
  if (isWithinMealWindow(time, "dinner")) return "dinner";
  return null;
}

/**
 * Check if there's a meal gap between two times
 */
export function detectMealGap(
  previousEndTime: string,
  nextStartTime: string,
): { hasGap: boolean; mealType: MealType | null } {
  const prevParts = previousEndTime.split(":");
  const nextParts = nextStartTime.split(":");

  if (prevParts.length < 2 || nextParts.length < 2) {
    return { hasGap: false, mealType: null };
  }

  const prevHours = Number(prevParts[0]);
  const prevMinutes = Number(prevParts[1]);
  const nextHours = Number(nextParts[0]);
  const nextMinutes = Number(nextParts[1]);

  if (Number.isNaN(prevHours) || Number.isNaN(prevMinutes) || Number.isNaN(nextHours) || Number.isNaN(nextMinutes)) {
    return { hasGap: false, mealType: null };
  }

  const prevMinutesTotal = prevHours * 60 + prevMinutes;
  const nextMinutesTotal = nextHours * 60 + nextMinutes;

  // Check if we're past breakfast window and before lunch
  if (prevMinutesTotal >= 9 * 60 && nextMinutesTotal <= 12 * 60) {
    return { hasGap: true, mealType: "breakfast" };
  }

  // Check if we're past lunch window and before dinner
  if (prevMinutesTotal >= 14 * 60 && nextMinutesTotal <= 18 * 60) {
    return { hasGap: true, mealType: "lunch" };
  }

  // Check if we're past dinner window
  if (prevMinutesTotal >= 21 * 60) {
    return { hasGap: true, mealType: "dinner" };
  }

  return { hasGap: false, mealType: null };
}

