import type { VibeId } from "@/data/vibes";

export type UserPreferences = {
  dietaryRestrictions: string[];
  accessibilityNeeds: {
    mobility?: boolean;
    visual?: boolean;
    notes?: string;
  };
  defaultGroupType?: "solo" | "couple" | "family" | "friends";
  defaultPace?: "relaxed" | "balanced" | "fast";
  accommodationStyle: string[];
  defaultVibes: VibeId[];
  learnedVibes: Record<string, number>;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dietaryRestrictions: [],
  accessibilityNeeds: {},
  defaultGroupType: undefined,
  defaultPace: undefined,
  accommodationStyle: [],
  defaultVibes: [],
  learnedVibes: {},
};
