/**
 * Duration-based gating for activity tips.
 *
 * Suppresses duration-context tips (e.g., "You're doing a medium-length activity")
 * when activity duration falls in the 60–180 minute "dead band" — the range where
 * such tips are neither useful (nor surprising).
 */

/**
 * Determines whether to suppress duration-related tips for an activity.
 *
 * @param durationMinutes Activity duration in minutes
 * @returns true if tip should be suppressed (60–180 min range), false otherwise
 */
export function shouldSuppressDurationTip(durationMinutes: number): boolean {
  return durationMinutes >= 60 && durationMinutes <= 180;
}
