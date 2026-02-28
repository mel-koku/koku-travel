/**
 * Types for the hybrid LLM layer that wraps itinerary generation.
 *
 * Three passes:
 * 1. Intent Extraction — extracts structured constraints from builder data + notes
 * 2. Day Refinement — holistic quality pass that can swap, reorder, or flag activities
 * 3. Guide Prose — personalized narrative replacing template-based guide text
 */

// ── Pass 1: Intent Extraction ──────────────────────────────────────

export type PinnedLocation = {
  locationName: string;
  preferredDay?: number;
  preferredTimeSlot?: "morning" | "afternoon" | "evening";
  reason: string;
};

export type DayConstraint = {
  dayIndex: number;
  label: string;
  categoryEmphasis?: string;
  timeSlot?: "morning" | "afternoon" | "evening";
  mealType?: "breakfast" | "lunch" | "dinner";
};

export type PacingHint =
  | "very_relaxed"
  | "relaxed"
  | "balanced"
  | "active"
  | "intense";

export type TimePreference =
  | "morning_person"
  | "night_owl"
  | "no_preference";

export type IntentExtractionResult = {
  pinnedLocations: PinnedLocation[];
  excludedCategories: string[];
  dayConstraints: DayConstraint[];
  pacingHint?: PacingHint;
  categoryWeights: Record<string, number>;
  timePreference?: TimePreference;
  additionalInsights: string[];
};

// ── Pass 2: Day Refinement ─────────────────────────────────────────

export type SwapPatch = {
  type: "swap";
  dayIndex: number;
  targetActivityId: string;
  replacementLocationId: string;
  reason: string;
};

export type ReorderPatch = {
  type: "reorder";
  dayIndex: number;
  newOrder: string[];
  reason: string;
};

export type FlagPatch = {
  type: "flag";
  dayIndex: number;
  activityId: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type RefinementPatch = SwapPatch | ReorderPatch | FlagPatch;

export type DayRefinementResult = {
  patches: RefinementPatch[];
  qualityScore: number;
  summary: string;
};

// ── Pass 3: Guide Prose ────────────────────────────────────────────

export type GeneratedDayGuide = {
  dayId: string;
  intro: string;
  transitions: string[];
  culturalMoment?: string;
  practicalTip?: string;
  summary: string;
};

export type GeneratedGuide = {
  tripOverview: string;
  days: GeneratedDayGuide[];
};
