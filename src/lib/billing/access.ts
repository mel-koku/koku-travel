import { TIER_PRICES, TIER_THRESHOLDS, type UnlockTier } from "./types";

export function getTripTier(totalDays: number): UnlockTier {
  if (totalDays <= TIER_THRESHOLDS.short) return "short";
  if (totalDays <= TIER_THRESHOLDS.standard) return "standard";
  return "long";
}

export function getTierPrice(tier: UnlockTier): number {
  return TIER_PRICES[tier];
}

export function getTierPriceDollars(tier: UnlockTier): number {
  return TIER_PRICES[tier] / 100;
}

export function isTripUnlocked(trip: { unlockedAt: string | null }): boolean {
  return trip.unlockedAt !== null;
}

export function isDayAccessible(
  dayIndex: number,
  tripUnlocked: boolean,
  fullAccessEnabled: boolean,
): boolean {
  if (dayIndex === 0) return true;
  return tripUnlocked || fullAccessEnabled;
}

/**
 * isFullAccessEnabled() is server-only (imports Sanity contentService).
 * Import from "@/lib/billing/accessServer" in API routes and server components.
 * Client components should receive fullAccessEnabled as a prop.
 */

export const MAX_FREE_REFINEMENTS = 1;
export const MAX_PAID_REFINEMENTS = 75;
export const UNLOCK_CEREMONY_MIN_MS = 12_000;
