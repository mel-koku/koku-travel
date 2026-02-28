/**
 * Validates that selected regions/cities are realistic for the trip duration.
 */

export type DurationWarning = {
  message: string;
  severity: "warning" | "info";
};

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

  const maxRecommended =
    duration <= 3 ? 1 : duration <= 5 ? 2 : duration <= 7 ? 3 : duration <= 10 ? 4 : 5;

  if (regionCount > maxRecommended) {
    return {
      message: `For ${duration} days, we recommend ${maxRecommended} region${maxRecommended > 1 ? "s" : ""}. You've selected ${regionCount}.`,
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
        "Okinawa requires a domestic flight — consider dedicating 3+ days or visiting separately.",
      severity: "info",
    };
  }

  return null;
}
