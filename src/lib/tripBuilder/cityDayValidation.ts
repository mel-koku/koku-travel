/**
 * Validates the ratio of selected cities to available trip days.
 *
 * Enforces a hard maximum city count based on trip duration to prevent
 * unrealistic itineraries. Also provides advisory nudges when pacing
 * is tight but technically allowed.
 *
 * Thresholds are calibrated for Japan travel: intercity transit (even
 * by shinkansen) eats 2-4 hours per move, accommodation check-in/out
 * adds overhead, and the best experiences need unhurried time.
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
 * Returns the hard maximum and recommended city counts for a given
 * trip duration. The hard max blocks progression; the recommended
 * threshold triggers an advisory warning.
 *
 * Principle: ~2 days per city average for trips 6+ days. Shorter
 * trips get a bit more flexibility since nearby cities (e.g.
 * Tokyo + Kamakura) can share a base.
 */
export function getCityLimits(duration: number): {
  max: number;
  recommended: number;
} {
  if (duration <= 0) return { max: 0, recommended: 0 };
  if (duration <= 3) return { max: 2, recommended: 1 };
  if (duration <= 5) return { max: 3, recommended: 2 };
  if (duration <= 7) return { max: 4, recommended: 3 };
  if (duration <= 10) return { max: 5, recommended: 4 };
  if (duration <= 14) return { max: 7, recommended: 5 };
  if (duration <= 21) return { max: 9, recommended: 7 };
  return { max: 10, recommended: 8 };
}

/**
 * Hard rules:
 *  1. Cannot select more cities than trip days (each needs >= 1 day)
 *  2. Cannot exceed the duration-based max city count
 *
 * Advisory nudges (non-blocking):
 *  - Above recommended but within max: strong pacing warning
 *  - At recommended with few days per city: gentle nudge
 */
export function validateCityDayRatio(
  cityCount: number,
  duration: number,
): CityDayValidation {
  if (cityCount === 0 || duration === 0) {
    return { isValid: true };
  }

  const { max, recommended } = getCityLimits(duration);

  // Hard blocker 1: more cities than days
  if (cityCount > duration) {
    return {
      isValid: false,
      hint: `You have ${duration} ${duration === 1 ? "day" : "days"} but ${cityCount} cities selected. Remove ${cityCount - duration} to continue.`,
      message: `Each city needs at least 1 full day. Remove ${cityCount - duration} ${cityCount - duration === 1 ? "city" : "cities"} to continue.`,
      severity: "error",
    };
  }

  // Hard blocker 2: exceeds max cities for this duration
  if (cityCount > max) {
    const excess = cityCount - max;
    return {
      isValid: false,
      hint: `For a ${duration}-day trip, we recommend up to ${max} cities. Remove ${excess} to continue.`,
      message: `${cityCount} cities in ${duration} days means constant packing and transit. For a ${duration}-day trip, select up to ${max} cities so you have time to actually experience each place. Remove ${excess} to continue.`,
      severity: "error",
    };
  }

  // Strong advisory: above recommended but within hard max
  if (cityCount > recommended) {
    const daysPerCity = (duration / cityCount).toFixed(1);
    return {
      isValid: true,
      message: `${cityCount} cities in ${duration} days (~${daysPerCity} days each) is doable but fast-paced. You'll spend a good chunk of each day in transit. We'd recommend ${recommended} cities or fewer for a more relaxed trip.`,
      severity: "warning",
    };
  }

  // Gentle nudge: at recommended with tight pacing
  if (cityCount === recommended && cityCount >= 3 && duration / cityCount < 2.5) {
    return {
      isValid: true,
      message: `${cityCount} cities is a solid plan for ${duration} days. Just keep in mind that moving between cities takes time, so consider whether you'd enjoy a deeper stay in fewer places.`,
      severity: "info",
    };
  }

  // Gentle nudge: single city with many days
  if (cityCount === 1 && duration >= 5) {
    return {
      isValid: true,
      message: `${duration} days in one city gives you plenty of depth. If you want more variety, consider adding a day trip or a second base.`,
      severity: "info",
    };
  }

  return { isValid: true };
}
