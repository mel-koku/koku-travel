import type { TravelerProfile, BudgetLevel, GroupType, ExperienceLevel, WeatherPreference } from "@/types/traveler";
import { DEFAULT_TRAVELER_PROFILE } from "@/types/traveler";
import type { TripBuilderData } from "@/types/trip";

/**
 * Builds a TravelerProfile from TripBuilderData
 */
export function buildTravelerProfile(data: TripBuilderData): TravelerProfile {
  const profile: TravelerProfile = {
    ...DEFAULT_TRAVELER_PROFILE,
    pace: data.style ?? "balanced",
    interests: data.interests ?? [],
    budget: {
      total: data.budget?.total,
      perDay: data.budget?.perDay,
      level: data.budget?.level ?? "moderate",
    },
    mobility: {
      required: data.accessibility?.mobility ?? false,
      needs: data.accessibility?.mobility ? ["step_free_access"] : undefined,
    },
    dietary: {
      restrictions: data.accessibility?.dietary ?? [],
      notes: data.accessibility?.dietaryOther || data.accessibility?.notes,
    },
    group: {
      size: data.group?.size ?? 1,
      type: data.group?.type ?? "solo",
      childrenAges: data.group?.childrenAges,
    },
  };

  return profile;
}

/**
 * Validates a TravelerProfile
 */
export function validateTravelerProfile(profile: TravelerProfile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate pace
  if (!["relaxed", "balanced", "fast"].includes(profile.pace)) {
    errors.push("Invalid pace value");
  }

  // Validate budget
  if (!profile.budget.level || !["budget", "moderate", "luxury"].includes(profile.budget.level)) {
    errors.push("Invalid budget level");
  }

  if (profile.budget.total !== undefined && profile.budget.total < 0) {
    errors.push("Budget total cannot be negative");
  }

  if (profile.budget.perDay !== undefined && profile.budget.perDay < 0) {
    errors.push("Budget per day cannot be negative");
  }

  // Validate group
  if (profile.group.size < 1) {
    errors.push("Group size must be at least 1");
  }

  if (!["solo", "couple", "family", "friends", "business"].includes(profile.group.type)) {
    errors.push("Invalid group type");
  }

  // Validate children ages if group type is family
  if (profile.group.type === "family" && profile.group.childrenAges) {
    const invalidAges = profile.group.childrenAges.filter((age) => age < 0 || age > 18);
    if (invalidAges.length > 0) {
      errors.push("Children ages must be between 0 and 18");
    }
  }

  // Validate experience level if provided
  if (profile.experienceLevel && !["beginner", "intermediate", "advanced"].includes(profile.experienceLevel)) {
    errors.push("Invalid experience level");
  }

  // Validate weather preferences if provided
  if (
    profile.weatherPreferences &&
    !["indoor_alternatives", "outdoor_preferred", "no_preference"].includes(profile.weatherPreferences.preference)
  ) {
    errors.push("Invalid weather preference");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merges a partial TravelerProfile with defaults
 */
export function mergeTravelerProfile(
  partial: Partial<TravelerProfile>,
  defaults: TravelerProfile = DEFAULT_TRAVELER_PROFILE,
): TravelerProfile {
  return {
    ...defaults,
    ...partial,
    budget: {
      ...defaults.budget,
      ...partial.budget,
    },
    mobility: {
      ...defaults.mobility,
      ...partial.mobility,
    },
    group: {
      ...defaults.group,
      ...partial.group,
    },
    dietary: {
      ...defaults.dietary,
      ...partial.dietary,
    },
    weatherPreferences: partial.weatherPreferences ?? defaults.weatherPreferences,
  };
}

