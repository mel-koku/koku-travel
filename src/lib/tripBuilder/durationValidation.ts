/**
 * Validates that selected regions/cities are realistic for the trip duration.
 */

export type DurationWarning = {
  message: string;
  severity: "warning" | "info";
};

/**
 * Recommended max regions by duration. Tightened to align with the
 * city limit table: spreading across many regions forces more intercity
 * travel and less time in each place.
 */
function getMaxRecommendedRegions(duration: number): number {
  if (duration <= 3) return 1;
  if (duration <= 5) return 2;
  if (duration <= 7) return 2;
  if (duration <= 10) return 3;
  if (duration <= 14) return 4;
  return 5;
}

/**
 * Check if the number of regions is realistic for the trip duration.
 * Also checks Okinawa isolation (requires domestic flight).
 */
export function validateDurationRegionFit(
  duration: number,
  regions: string[],
  cities: string[]
): DurationWarning | null {
  const regionCount = regions.length;
  if (regionCount === 0 || !duration) return null;

  const maxRecommended = getMaxRecommendedRegions(duration);

  if (regionCount > maxRecommended) {
    return {
      message: `For ${duration} days, we recommend ${maxRecommended} region${maxRecommended > 1 ? "s" : ""} so you're not constantly in transit. You've selected ${regionCount}.`,
      severity: "warning",
    };
  }

  // Okinawa isolation check
  if (
    cities.includes("naha") &&
    regionCount > 1 &&
    duration < 10
  ) {
    return {
      message:
        "Okinawa requires a domestic flight. Consider dedicating 3+ days or visiting separately.",
      severity: "info",
    };
  }

  return null;
}
