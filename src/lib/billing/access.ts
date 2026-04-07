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

export async function isFullAccessEnabled(): Promise<boolean> {
  if (process.env.FREE_FULL_ACCESS === "true") return true;

  try {
    const { getTripBuilderConfig } = await import("@/lib/sanity/contentService");
    const config = await getTripBuilderConfig();
    const window = config?.freeAccessWindow;
    if (window?.startDate && window?.endDate) {
      const now = new Date();
      const start = new Date(window.startDate);
      const end = new Date(window.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    }
  } catch {
    // Sanity unavailable -- default to paywall active
  }

  return false;
}

export const MAX_FREE_REFINEMENTS = 1;
export const UNLOCK_CEREMONY_MIN_MS = 12_000;
