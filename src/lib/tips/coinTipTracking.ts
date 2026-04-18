/**
 * 5-Yen coin tip deduplication logic.
 *
 * Suppresses the "5-yen coin for wishing" tip after it appears once per trip.
 * Uses trip-level state (planningWarnings.coinTipShown) to track display.
 */

/**
 * Determines whether to show the 5-yen coin tip based on trip state.
 *
 * @param tripPlanningWarnings Trip's planningWarnings state object
 * @returns true if tip should be shown, false if already displayed in this trip
 */
export function shouldShow5YenCoinTip(tripPlanningWarnings?: Record<string, unknown>): boolean {
  if (!tripPlanningWarnings) return true;
  const coinTipShown = tripPlanningWarnings.coinTipShown as boolean | undefined;
  return coinTipShown !== true;
}

/**
 * Marks the 5-yen coin tip as shown in trip state.
 * Call this when the tip is first displayed to prevent future displays.
 *
 * @returns Updated planningWarnings object with coinTipShown = true
 */
export function mark5YenCoinTipShown(
  currentWarnings?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(currentWarnings ?? {}),
    coinTipShown: true,
  };
}
