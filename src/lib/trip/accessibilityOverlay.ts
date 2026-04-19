import type { StoredTrip } from "@/services/trip/types";

/**
 * Whether to surface the AccessibilityBanner for this trip.
 *
 * Gated strictly on the user's accessibility.mobility flag from trip builder.
 * Keeps the banner opt-in so trips without the flag don't see content that
 * doesn't apply to them.
 */
export function shouldShowAccessibilityBanner(trip: StoredTrip): boolean {
  return trip.builderData?.accessibility?.mobility === true;
}
