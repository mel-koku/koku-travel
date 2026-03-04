/**
 * Default duration in minutes for different location categories.
 * These are fallback values when more specific data isn't available.
 *
 * Includes both specific categories (shrine, temple, museum, landmark)
 * and generic fallback categories (culture, food, nature) for backwards
 * compatibility with legacy data.
 */
const CATEGORY_DEFAULT_DURATIONS: Record<string, number> = {
  // Specific categories (preferred)
  shrine: 60, // Shinto shrines - typically 30-90 minutes
  temple: 90, // Buddhist temples - often have gardens, multiple buildings
  landmark: 120, // Castles, towers - extensive grounds, multiple areas
  museum: 120, // Museums - comprehensive visits
  historic: 90, // Historic sites - variable but often extensive
  park: 90, // Parks - leisurely visits
  garden: 60, // Japanese gardens - contemplative but focused
  viewpoint: 30, // Observation decks - quick visits
  market: 90, // Markets - browsing and food
  restaurant: 60, // Dining - typical meal duration
  bar: 90, // Bars - evening drinks
  entertainment: 120, // Shows, events
  onsen: 90, // Hot springs - soaking + relaxation

  // New specific categories
  castle: 120, // Japanese castles - extensive grounds
  cafe: 45, // Cafes - shorter than restaurants
  theater: 120, // Theater performances
  aquarium: 120, // Aquariums - walkthrough exhibits
  zoo: 180, // Zoos - large grounds
  beach: 180, // Beach visits - leisurely
  historic_site: 90, // Historic sites - variable
  craft: 90, // Craft workshops - typically 1-2 hours

  // Generic fallback categories (for legacy data)
  culture: 90, // Generic cultural sites
  nature: 120, // Generic nature (hiking, etc.)
  shopping: 90, // Generic shopping
  view: 30, // Generic viewpoints

  // Infrastructure (not visit durations)
  accommodation: 0,
  transportation: 0,
};

const DEFAULT_DURATION = 90; // Default fallback in minutes

/**
 * Returns the default duration in minutes for a given location category.
 */
export function getCategoryDefaultDuration(category: string): number {
  return CATEGORY_DEFAULT_DURATIONS[category] ?? DEFAULT_DURATION;
}

