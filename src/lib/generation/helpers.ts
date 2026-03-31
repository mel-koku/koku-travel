import { getRegionForCity, REGIONS } from "@/data/regions";
import { DINING_CATEGORIES } from "@/data/mealCategories";
import type { Location } from "@/types/location";
import type { InterestId, TripBuilderData } from "@/types/trip";
import { vibesToInterests } from "@/data/vibes";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";
import { CITY_INFO_BY_KEY } from "@/lib/routing/citySequence";

// ── Constants ───────────────────────────────────────────────────────

export const DEFAULT_TOTAL_DAYS = 5;
export const DEFAULT_INTEREST_ROTATION: readonly InterestId[] = ["culture", "nature", "shopping"];

/**
 * Food-related location categories for meal detection.
 */
export const FOOD_CATEGORIES = new Set<string>(DINING_CATEGORIES);

type LocationCategory = Location["category"];

// ── Pure helper functions ───────────────────────────────────────────

/**
 * Check if a location category indicates a food/dining establishment.
 */
export function isFoodCategory(category: string): boolean {
  return FOOD_CATEGORIES.has(category.toLowerCase());
}

/**
 * Infer meal type from time of day.
 */
export function inferMealTypeFromTimeSlot(
  timeSlot: "morning" | "afternoon" | "evening"
): "breakfast" | "lunch" | "dinner" {
  switch (timeSlot) {
    case "morning":
      return "breakfast";
    case "afternoon":
      return "lunch";
    case "evening":
      return "dinner";
  }
}

/**
 * Pick a time slot for a saved location based on its category.
 * Falls back to the least-used slot when the preferred slot is >80% capacity.
 */
export function pickTimeSlotForSaved(
  category: string,
  timeSlotUsage: Map<string, number>,
): "morning" | "afternoon" | "evening" {
  const cat = category.toLowerCase();

  // Category -> preferred time slot mapping
  const EVENING_CATS = new Set(["bar", "entertainment"]);
  const AFTERNOON_CATS = new Set(["museum", "shopping", "mall", "craft"]);
  const MORNING_CATS = new Set(["shrine", "temple", "park", "garden", "market", "nature", "viewpoint"]);

  let preferred: "morning" | "afternoon" | "evening" = "morning";
  if (EVENING_CATS.has(cat)) preferred = "evening";
  else if (AFTERNOON_CATS.has(cat)) preferred = "afternoon";
  else if (MORNING_CATS.has(cat)) preferred = "morning";

  // Check if preferred slot is over 80% capacity
  const capacities = { morning: 180, afternoon: 300, evening: 240 };
  const usage = timeSlotUsage.get(preferred) ?? 0;
  if (usage < capacities[preferred] * 0.8) return preferred;

  // Overflow to the least-used slot
  const slots: ("morning" | "afternoon" | "evening")[] = ["morning", "afternoon", "evening"];
  slots.sort((a, b) => (timeSlotUsage.get(a) ?? 0) - (timeSlotUsage.get(b) ?? 0));
  return slots[0]!;
}

export function resolveInterestSequence(data: TripBuilderData): InterestId[] {
  if (data.vibes && data.vibes.length > 0) {
    return vibesToInterests(data.vibes);
  }
  return [...DEFAULT_INTEREST_ROTATION];
}

export function buildTags(interest: InterestId, category: LocationCategory): string[] {
  const tags: string[] = [];
  const interestMap: Record<InterestId, string> = {
    culture: "cultural",
    food: "dining",
    nature: "nature",
    nightlife: "nightlife",
    shopping: "shopping",
    photography: "photo spot",
    wellness: "relaxation",
    history: "historical",
    craft: "artisan",
  };

  const categoryMap: Record<string, string> = {
    shrine: "shrine",
    temple: "temple",
    landmark: "landmark",
    restaurant: "restaurant",
    market: "market",
    park: "park",
    garden: "garden",
    shopping: "shopping",
    bar: "bar",
    entertainment: "entertainment",
    museum: "museum",
    viewpoint: "viewpoint",
    nature: "nature",
    culture: "culture",
    onsen: "onsen",
    wellness: "wellness",
    cafe: "cafe",
    aquarium: "aquarium",
    beach: "beach",
    castle: "castle",
    historic_site: "historic site",
    theater: "theater",
    zoo: "zoo",
    craft: "craft workshop",
  };

  const interestTag = interestMap[interest];
  if (interestTag) {
    tags.push(interestTag);
  }

  const categoryTag = categoryMap[category];
  if (categoryTag && categoryTag !== interestTag) {
    tags.push(categoryTag);
  }

  return tags;
}

export function buildDayTitle(dayIndex: number, cityKey: string): string {
  const region = getRegionForCity(cityKey);
  if (region) {
    const cityInfo = CITY_INFO_BY_KEY.get(cityKey);
    const cityLabel = cityInfo?.label ?? capitalize(cityKey);
    return `Day ${dayIndex + 1} (${cityLabel})`;
  }

  // For unknown cities, try to find city name from REGIONS
  for (const regionData of REGIONS) {
    const city = regionData.cities.find((c) => c.id === cityKey);
    if (city) {
      return `Day ${dayIndex + 1} (${city.name})`;
    }
  }
  const info = CITY_INFO_BY_KEY.get(cityKey);
  const label = info?.label ?? capitalize(cityKey);
  return `Day ${dayIndex + 1} (${label})`;
}

/**
 * Get the duration of a location in minutes.
 * Prefers recommendedVisit.typicalMinutes, falls back to parsing estimatedDuration string,
 * then category-based defaults.
 *
 * Note: This is a synchronous function used during initial itinerary generation.
 * For more accurate durations with Google Places data, see determineVisitDuration
 * in itineraryPlanner.ts which runs during the planning phase.
 *
 * Note: A near-identical function exists in src/lib/scoring/locationScoring.ts.
 * The difference is that this version only uses the category default when it differs
 * from the global 90-minute fallback, while the scoring version always uses it.
 * These should be consolidated in a future pass.
 */
export function getLocationDurationMinutes(location: Location): number {
  // 1. Prefer structured recommendation
  if (location.recommendedVisit?.typicalMinutes) {
    return location.recommendedVisit.typicalMinutes;
  }

  // 2. Parse estimatedDuration string (e.g., "1.5 hours", "2 hours", "0.5 hours")
  if (location.estimatedDuration) {
    const match = location.estimatedDuration.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)/i);
    if (match) {
      const hours = parseFloat(match[1] ?? "1");
      return Math.round(hours * 60);
    }
  }

  // 3. Use category-based default if available
  if (location.category) {
    const categoryDefault = getCategoryDefaultDuration(location.category);
    if (categoryDefault !== 90) {
      // Only use if it's different from the global default
      return categoryDefault;
    }
  }

  // 4. Default fallback: 90 minutes
  return 90;
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
