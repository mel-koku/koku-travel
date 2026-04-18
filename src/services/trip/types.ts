/**
 * Types for trip management operations
 */

import type { Itinerary, ItineraryEdit } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedGuide, GeneratedBriefings } from "@/types/llmConstraints";
import type { CulturalBriefing } from "@/types/culturalBriefing";

/**
 * Pre-trip prep checklist completion state. Keys are PrepItemId strings
 * (defined in src/data/prepChecklist.ts). Missing keys default to false.
 */
export type PrepState = Record<string, boolean>;

/**
 * Planning-phase warnings and one-time tips state.
 * Tracks which trip-level tips (goshuin, 5-yen coin) have been shown to avoid repetition.
 */
export type PlanningWarnings = {
  /** Whether the goshuin etiquette banner has been dismissed */
  goshuinShown?: boolean;
  /** Whether the 5-yen coin tip has been shown (only show once per trip) */
  coinTipShown?: boolean;
};

export type StoredTrip = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
  dailyBriefings?: GeneratedBriefings;
  culturalBriefing?: CulturalBriefing;
  // Trip Pass fields
  unlockedAt?: string | null;
  unlockTier?: "short" | "standard" | "long" | null;
  stripeSessionId?: string | null;
  unlockAmountCents?: number | null;
  freeRefinementsUsed?: number;
  /** Pre-trip checklist completion. Undefined on rows/responses older than the 2026-04-19 migration. */
  prepState?: PrepState;
  /** Planning warnings and one-time tip state. Undefined on rows/responses older than the 2026-04-18 migration. */
  planningWarnings?: PlanningWarnings;
};

export type CreateTripInput = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
  dailyBriefings?: GeneratedBriefings;
  culturalBriefing?: CulturalBriefing;
};

export type EditHistoryState = {
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;
};
