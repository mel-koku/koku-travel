export type UnlockTier = "short" | "standard" | "long";

export type TripPassState = {
  unlockedAt: string | null;
  unlockTier: UnlockTier | null;
  stripeSessionId: string | null;
  unlockAmountCents: number | null;
  freeRefinementsUsed: number;
};

export type CheckoutMetadata = {
  tripId: string;
  userId: string;
  tripLengthDays: number;
  tier: UnlockTier;
  launchPricing: boolean;
  cities: string;
};

export const TIER_PRICES: Record<UnlockTier, number> = {
  short: 1900,
  standard: 2900,
  long: 3900,
};

export const TIER_THRESHOLDS = {
  short: 7,
  standard: 14,
} as const;
