/**
 * Validates the ratio of selected cities to available trip days.
 *
 * Returns a validation result that can block progression (hard blocker)
 * or provide advisory feedback.
 */

export type CityDayValidation = {
  /** Whether the selection is valid (false = hard block) */
  isValid: boolean;
  /** Short message for the disabled-hint tooltip */
  hint?: string;
  /** Longer inline message for the Region step UI */
  message?: string;
  severity?: "error" | "warning" | "info";
};

/**
 * Hard rule: users cannot select more cities than trip days.
 * Each city needs at least 1 full day.
 *
 * Advisory: when city count is high relative to days, warn about
 * fast pacing (but don't block).
 */
export function validateCityDayRatio(
  cityCount: number,
  duration: number,
): CityDayValidation {
  if (cityCount === 0 || duration === 0) {
    return { isValid: true };
  }

  // Hard blocker: more cities than days
  if (cityCount > duration) {
    const maxCities = duration;
    return {
      isValid: false,
      hint: `You have ${duration} ${duration === 1 ? "day" : "days"} but ${cityCount} ${cityCount === 1 ? "city" : "cities"} selected. Remove ${cityCount - maxCities} to continue.`,
      message: `Each city needs at least 1 full day. You have ${duration} ${duration === 1 ? "day" : "days"} but ${cityCount} cities selected. Remove ${cityCount - maxCities} to continue.`,
      severity: "error",
    };
  }

  // Advisory: every day is a different city (tight but allowed)
  if (cityCount === duration && cityCount >= 3) {
    return {
      isValid: true,
      message: `${cityCount} cities in ${duration} days means a new city every day. That works, but consider removing a city or two for a less rushed trip.`,
      severity: "warning",
    };
  }

  return { isValid: true };
}
