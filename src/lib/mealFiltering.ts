/**
 * Shared meal filtering utilities
 *
 * This module provides constants and functions for filtering locations
 * by meal type and identifying dining establishments. Used by:
 * - itineraryEngine.ts
 * - smart-prompts/recommend/route.ts
 * - itineraryGenerator.ts
 */

import type { Location } from "@/types/location";

/**
 * Google types that are NOT appropriate for breakfast
 */
export const NOT_BREAKFAST_TYPES = new Set([
  "bar",
  "night_club",
  "pub",
  "wine_bar",
  "cocktail_bar",
  "brewery",
  "izakaya",
]);

/**
 * Keywords in name/description that indicate NOT appropriate for breakfast
 * Used as fallback when no Google data is available
 */
export const NOT_BREAKFAST_KEYWORDS = [
  "izakaya",
  "bar",
  "pub",
  "brewery",
  "sake",
  "cocktail",
  "night",
  "ramen", // Ramen is typically lunch/dinner in Japan
  "gyoza", // Usually dinner food
  "sukiyaki", // Hot pot - dinner experience
  "shabu", // Shabu-shabu hot pot - dinner
  "yakiniku", // BBQ - dinner
  "yakitori", // Grilled skewers - evening/night
];

/**
 * Keywords that indicate a place IS appropriate for breakfast
 */
export const BREAKFAST_KEYWORDS = [
  "cafe",
  "café",
  "coffee",
  "breakfast",
  "brunch",
  "morning",
  "bakery",
  "toast",
  "egg",
  "pancake",
];

/**
 * Keywords that indicate dessert/snack places (not meals)
 */
export const DESSERT_KEYWORDS = [
  "soft serve",
  "ice cream",
  "gelato",
  "dessert",
  "sweets",
  "parfait",
  "cake shop",
  "patisserie",
];

/**
 * Categories that indicate dining establishments
 */
export const DINING_CATEGORIES = ["restaurant", "bar", "market", "food"];

/**
 * Google Places types that indicate dining establishments
 */
export const DINING_GOOGLE_TYPES = [
  "restaurant",
  "cafe",
  "coffee_shop",
  "bar",
  "bakery",
  "ramen_restaurant",
  "sushi_restaurant",
  "japanese_restaurant",
  "fast_food_restaurant",
  "meal_takeaway",
  "food",
];

/**
 * Pattern to detect landmark names (should not be considered restaurants)
 */
export const LANDMARK_PATTERNS =
  /castle|shrine|temple|museum|palace|tower|park|garden|observatory|gate|historic|heritage|ruins|monument|jo\b|jinja|jingu|dera|taisha|-ji\b|城|神社|寺|塔|門/i;

/**
 * Check if text contains any of the keywords
 */
export function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Meal type options
 */
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Filter restaurants suitable for a specific meal type
 * Uses mealOptions, operating hours, Google type, and name/description keywords as signals
 */
export function filterByMealType(
  restaurants: Location[],
  mealType: MealType,
): Location[] {
  return restaurants.filter((restaurant) => {
    const mealOptions = restaurant.mealOptions;
    const googleType = restaurant.googlePrimaryType?.toLowerCase() ?? "";
    const googleTypes = restaurant.googleTypes ?? [];
    const nameAndDesc = `${restaurant.name} ${restaurant.shortDescription ?? ""} ${restaurant.description ?? ""}`;
    const hasGoogleData = googleType !== "" || googleTypes.length > 0;

    // For breakfast, exclude bars/breweries/pubs and other inappropriate places
    if (mealType === "breakfast") {
      // Check if it's a bar/brewery type (Google data)
      const isBarType =
        NOT_BREAKFAST_TYPES.has(googleType) ||
        googleTypes.some((t) => NOT_BREAKFAST_TYPES.has(t.toLowerCase()));

      if (isBarType) {
        return false;
      }

      // Fallback: Check name/description for bar/izakaya/ramen keywords when no Google data
      if (!hasGoogleData) {
        // Exclude if contains not-breakfast keywords
        if (containsKeyword(nameAndDesc, NOT_BREAKFAST_KEYWORDS)) {
          return false;
        }
        // Exclude dessert places from breakfast (soft serve, ice cream, etc.)
        if (containsKeyword(nameAndDesc, DESSERT_KEYWORDS)) {
          return false;
        }
        // Prefer places with breakfast keywords
        if (containsKeyword(nameAndDesc, BREAKFAST_KEYWORDS)) {
          return true;
        }
      }

      // If we have mealOptions, use it
      if (mealOptions) {
        // Prefer places that serve breakfast or brunch
        if (mealOptions.servesBreakfast === true || mealOptions.servesBrunch === true) {
          return true;
        }
        // Exclude if explicitly doesn't serve breakfast and we have data
        if (mealOptions.servesBreakfast === false && mealOptions.servesBrunch === false) {
          return false;
        }
      }

      // Check operating hours - breakfast places should open before 10am
      if (restaurant.operatingHours?.periods) {
        const today = new Date().getDay(); // 0 = Sunday
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayPeriod = restaurant.operatingHours.periods.find((p) => p.day === dayNames[today]);
        if (todayPeriod?.open) {
          const openHour = parseInt(todayPeriod.open.split(":")[0] ?? "12", 10);
          // If opens after 11am, not a breakfast place
          if (openHour >= 11) {
            return false;
          }
        }
      }

      // Include cafes for breakfast
      if (googleType === "cafe" || googleTypes.includes("cafe")) {
        return true;
      }
    }

    // For lunch, check if serves lunch and operating hours
    if (mealType === "lunch") {
      if (mealOptions) {
        if (mealOptions.servesLunch === true) {
          return true;
        }
        if (mealOptions.servesLunch === false) {
          // Only exclude if we have explicit data that it doesn't serve lunch
          // and it's specifically a dinner-only place
          if (mealOptions.servesDinner === true && !mealOptions.servesBreakfast) {
            return false;
          }
        }
      }

      // Check operating hours - exclude places that only open for dinner (after 5pm)
      if (restaurant.operatingHours?.periods) {
        const today = new Date().getDay(); // 0 = Sunday
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayPeriod = restaurant.operatingHours.periods.find((p) => p.day === dayNames[today]);
        if (todayPeriod?.open) {
          const openHour = parseInt(todayPeriod.open.split(":")[0] ?? "12", 10);
          // If opens at 5pm or later, it's a dinner-only place
          if (openHour >= 17) {
            return false;
          }
        }
      }
    }

    // For dinner, check if serves dinner and operating hours
    if (mealType === "dinner") {
      if (mealOptions) {
        if (mealOptions.servesDinner === true) {
          return true;
        }
        if (mealOptions.servesDinner === false) {
          // Only exclude if it's specifically breakfast/lunch only
          if (mealOptions.servesBreakfast || mealOptions.servesLunch) {
            return false;
          }
        }
      }

      // Check operating hours - exclude places that close early (before 6pm)
      if (restaurant.operatingHours?.periods) {
        const today = new Date().getDay(); // 0 = Sunday
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayPeriod = restaurant.operatingHours.periods.find((p) => p.day === dayNames[today]);
        if (todayPeriod?.close) {
          const closeHour = parseInt(todayPeriod.close.split(":")[0] ?? "22", 10);
          // If closes before 6pm, it's not open for dinner
          if (closeHour < 18) {
            return false;
          }
        }
      }
    }

    // Default: include if no disqualifying criteria
    return true;
  });
}

/**
 * Check if a location is a dining establishment
 *
 * Uses multiple signals to determine if a location is a restaurant/cafe:
 * 1. Google primary type
 * 2. Google types array
 * 3. Category field
 * 4. Name patterns (with landmark exclusion)
 */
export function isDiningLocation(location: Location): boolean {
  // Exclude permanently closed locations
  if (location.businessStatus === "PERMANENTLY_CLOSED") {
    return false;
  }

  // Check Google primary type first (most accurate)
  if (location.googlePrimaryType && DINING_GOOGLE_TYPES.includes(location.googlePrimaryType)) {
    return true;
  }

  // Check Google types array
  if (location.googleTypes?.some((type) => DINING_GOOGLE_TYPES.includes(type))) {
    return true;
  }

  // Fallback to category-based filtering
  // Must be in a dining category
  const isDiningCategory = DINING_CATEGORIES.includes(location.category || "");

  // Must NOT match landmark name patterns (safety check for miscategorized locations)
  const isLandmark = LANDMARK_PATTERNS.test(location.name);

  // Include if it's a restaurant keyword even if category is wrong
  const hasRestaurantKeyword = /restaurant|ramen|sushi|izakaya|cafe|café|dining/i.test(location.name);

  return (isDiningCategory && !isLandmark) || (hasRestaurantKeyword && !isLandmark);
}
