import type { UserPreferences, PreferenceEvent } from "@/types/userPreferences";
import { DEFAULT_USER_PREFERENCES } from "@/types/userPreferences";
import { USER_PREFERENCES_STORAGE_KEY } from "@/lib/constants/storage";
import { getLocal, setLocal, removeLocal } from "@/lib/storageHelpers";

/**
 * Load user preferences from localStorage
 */
export function loadUserPreferences(): UserPreferences {
  const parsed = getLocal<UserPreferences>(USER_PREFERENCES_STORAGE_KEY);
  if (!parsed) {
    return DEFAULT_USER_PREFERENCES;
  }

  // Validate and merge with defaults
  return {
    replacedActivities: parsed.replacedActivities ?? [],
    skippedActivities: parsed.skippedActivities ?? [],
    favoriteActivities: parsed.favoriteActivities ?? [],
    preferredCategories: parsed.preferredCategories ?? {},
    preferredPriceRanges: parsed.preferredPriceRanges ?? {},
    preferredActivityTypes: parsed.preferredActivityTypes ?? {},
    lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
  };
}

/**
 * Save user preferences to localStorage
 */
export function saveUserPreferences(preferences: UserPreferences): void {
  const updated = {
    ...preferences,
    lastUpdated: new Date().toISOString(),
  };
  setLocal(USER_PREFERENCES_STORAGE_KEY, updated);
}

/**
 * Record a preference event and update preferences
 */
export function recordPreferenceEvent(event: PreferenceEvent): UserPreferences {
  const preferences = loadUserPreferences();
  const updated = { ...preferences };

  switch (event.type) {
    case "replace":
      // Add to replaced activities (remove if already exists)
      updated.replacedActivities = updated.replacedActivities.filter(
        (a) => a.activityId !== event.activityId,
      );
      updated.replacedActivities.push({
        activityId: event.activityId,
        locationId: event.locationId,
        replacedAt: event.timestamp,
        reason: event.reason,
      });
      
      // Learn from replacement - penalize the replaced location's category
      if (event.location) {
        const category = event.location.category ?? "unknown";
        updated.preferredCategories[category] = (updated.preferredCategories[category] ?? 0) - 1;
      }
      break;

    case "skip":
      // Add to skipped activities
      updated.skippedActivities = updated.skippedActivities.filter(
        (a) => a.activityId !== event.activityId,
      );
      updated.skippedActivities.push({
        activityId: event.activityId,
        locationId: event.locationId,
        skippedAt: event.timestamp,
      });
      
      // Learn from skip - penalize the skipped location's category
      if (event.location) {
        const category = event.location.category ?? "unknown";
        updated.preferredCategories[category] = (updated.preferredCategories[category] ?? 0) - 0.5;
      }
      break;

    case "favorite":
      // Add to favorite activities
      updated.favoriteActivities = updated.favoriteActivities.filter(
        (a) => a.activityId !== event.activityId,
      );
      updated.favoriteActivities.push({
        activityId: event.activityId,
        locationId: event.locationId,
        favoritedAt: event.timestamp,
      });
      
      // Learn from favorite - boost the location's category and price range
      if (event.location) {
        const category = event.location.category ?? "unknown";
        updated.preferredCategories[category] = (updated.preferredCategories[category] ?? 0) + 2;
        
        // Learn price preference
        const priceRange = event.location.minBudget ?? "moderate";
        updated.preferredPriceRanges[priceRange] = (updated.preferredPriceRanges[priceRange] ?? 0) + 1;
      }
      break;

    case "unfavorite":
      // Remove from favorite activities
      updated.favoriteActivities = updated.favoriteActivities.filter(
        (a) => a.activityId !== event.activityId,
      );
      
      // Slightly reduce preference for this category
      if (event.location) {
        const category = event.location.category ?? "unknown";
        updated.preferredCategories[category] = (updated.preferredCategories[category] ?? 0) - 0.5;
      }
      break;
  }

  saveUserPreferences(updated);
  return updated;
}

/**
 * Clear all user preferences
 */
export function clearUserPreferences(): void {
  removeLocal(USER_PREFERENCES_STORAGE_KEY);
}

