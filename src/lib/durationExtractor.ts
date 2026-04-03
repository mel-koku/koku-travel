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
  shrine: 40, // Most shrines are 20-40 min. Major ones have expert-set durations.
  temple: 60, // Most temples are 30-60 min. Major complexes have expert-set durations.
  landmark: 45, // Most landmarks are quick visits. Districts/compounds have expert-set durations.
  museum: 90, // Mid-tier museums. Large ones have expert-set durations.
  historic: 60, // Historic sites - walkable
  park: 60, // Parks - leisurely 1-hour visits
  garden: 60, // Japanese gardens - contemplative but focused
  viewpoint: 20, // Observation points - look and go
  market: 60, // Markets - browsing and food
  restaurant: 60, // Dining - typical meal duration
  bar: 60, // Bars - evening drinks
  entertainment: 150, // Theme parks and shows skew longer
  onsen: 90, // Hot springs - soaking + relaxation

  // New specific categories
  castle: 75, // Most castles outside top 300 are small/ruins
  cafe: 40, // Cafes - shorter than restaurants
  theater: 120, // Theater performances
  aquarium: 120, // Aquariums - walkthrough exhibits
  zoo: 180, // Zoos - large grounds
  beach: 180, // Beach visits - leisurely
  historic_site: 60, // Historic sites - walkable
  craft: 75, // Craft workshops - typically 60-90 min

  // Generic fallback categories (for legacy data)
  culture: 60, // Generic cultural sites
  nature: 90, // Generic nature
  shopping: 60, // Generic shopping
  view: 20, // Generic viewpoints

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

