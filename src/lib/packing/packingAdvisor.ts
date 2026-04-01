/**
 * Multi-Region Packing Intelligence
 *
 * Rules engine (~30 rules) analyzing itinerary activities, cities, and trip context
 * to produce a categorized packing checklist.
 */

export type PackingCategory =
  | "essentials"
  | "clothing"
  | "temple_visits"
  | "outdoor"
  | "tech"
  | "comfort"
  | "food_drink"
  | "seasonal";

export interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  reason: string;
}

export interface PackingChecklist {
  items: PackingItem[];
}

// ---------------------------------------------------------------------------
// Category labels for display
// ---------------------------------------------------------------------------

export const PACKING_CATEGORY_LABELS: Record<PackingCategory, string> = {
  essentials: "Essentials",
  clothing: "Clothing",
  temple_visits: "Temple Visits",
  outdoor: "Outdoor & Nature",
  tech: "Tech & Connectivity",
  comfort: "Comfort",
  food_drink: "Food & Drink",
  seasonal: "Seasonal",
};

export const PACKING_CATEGORY_ICONS: Record<PackingCategory, string> = {
  essentials: "🎒",
  clothing: "👕",
  temple_visits: "⛩️",
  outdoor: "🥾",
  tech: "📱",
  comfort: "🧳",
  food_drink: "🍵",
  seasonal: "🌦️",
};

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

type PackingRule = {
  id: string;
  name: string;
  category: PackingCategory;
  reason: string;
  condition: (ctx: PackingContext) => boolean;
};

type PackingContext = {
  /** Trip duration in days */
  duration: number;
  /** Selected city IDs */
  cities: string[];
  /** All activity categories across the trip */
  activityCategories: Set<string>;
  /** Trip month (1-12) */
  month: number;
  /** Has onsen/sento activities */
  hasOnsen: boolean;
  /** Has hiking/nature activities */
  hasNature: boolean;
  /** Has temple/shrine visits */
  hasTemples: boolean;
  /** Has beach activities */
  hasBeach: boolean;
  /** Multi-city trip */
  isMultiCity: boolean;
  /** Traveler group type */
  groupType?: string;
};

const COLD_MONTHS = new Set([1, 2, 3, 11, 12]);
const HOT_MONTHS = new Set([6, 7, 8, 9]);
const RAINY_MONTHS = new Set([6, 7]); // Tsuyu season
const HOKKAIDO_CITIES = new Set(["sapporo", "hakodate"]);

const RULES: PackingRule[] = [
  // --- Essentials (always) ---
  { id: "passport", name: "Passport & copies", category: "essentials", reason: "Required for entry and hotel check-in", condition: () => true },
  { id: "cash-yen", name: "Japanese yen (cash)", category: "essentials", reason: "Many places are cash-only", condition: () => true },
  { id: "ic-card", name: "IC card (Suica/Pasmo)", category: "essentials", reason: "Essential for trains, buses, and konbini", condition: (ctx) => ctx.duration >= 2 },
  { id: "travel-insurance", name: "Travel insurance docs", category: "essentials", reason: "Healthcare is expensive for tourists", condition: () => true },
  { id: "power-adapter", name: "Power adapter (Type A)", category: "essentials", reason: "Japan uses Type A plugs (same as US)", condition: () => true },

  // --- Clothing ---
  { id: "walking-shoes", name: "Comfortable walking shoes", category: "clothing", reason: "You'll walk 15,000-25,000 steps daily", condition: () => true },
  { id: "slip-on-shoes", name: "Slip-on shoes", category: "clothing", reason: "Frequent shoe removal at temples, restaurants, and ryokan", condition: (ctx) => ctx.hasTemples },
  { id: "layers", name: "Light layers", category: "clothing", reason: "Temperature varies between indoor and outdoor", condition: () => true },
  { id: "rain-jacket", name: "Packable rain jacket", category: "clothing", reason: "Rainy season. Expect daily showers.", condition: (ctx) => RAINY_MONTHS.has(ctx.month) },
  { id: "warm-coat", name: "Warm coat", category: "clothing", reason: "Winter temperatures drop to 0-5°C", condition: (ctx) => COLD_MONTHS.has(ctx.month) },
  { id: "hokkaido-warmth", name: "Thermal underlayers", category: "clothing", reason: "Hokkaido is significantly colder", condition: (ctx) => ctx.cities.some((c) => HOKKAIDO_CITIES.has(c)) && COLD_MONTHS.has(ctx.month) },
  { id: "swimwear", name: "Swimwear", category: "clothing", reason: "For beach days", condition: (ctx) => ctx.hasBeach },
  { id: "hat-sun", name: "Sun hat", category: "clothing", reason: "Strong summer sun. Protect yourself outdoors.", condition: (ctx) => HOT_MONTHS.has(ctx.month) },

  // --- Temple Visits ---
  { id: "modest-clothing", name: "Modest clothing (covered shoulders)", category: "temple_visits", reason: "Required at some temples and shrines", condition: (ctx) => ctx.hasTemples },
  { id: "coin-pouch", name: "Coin pouch (¥5 & ¥100 coins)", category: "temple_visits", reason: "For offerings and goshuin stamps", condition: (ctx) => ctx.hasTemples },
  { id: "small-towel", name: "Small towel (tenugui)", category: "temple_visits", reason: "For hand washing at purification fountains", condition: (ctx) => ctx.hasTemples },

  // --- Outdoor & Nature ---
  { id: "hiking-shoes", name: "Hiking shoes", category: "outdoor", reason: "Trail activities in your itinerary", condition: (ctx) => ctx.hasNature },
  { id: "water-bottle", name: "Reusable water bottle", category: "outdoor", reason: "Japan has excellent tap water and many refill stations", condition: (ctx) => ctx.hasNature || HOT_MONTHS.has(ctx.month) },
  { id: "sunscreen", name: "Sunscreen", category: "outdoor", reason: "UV is strong, especially at altitude", condition: (ctx) => ctx.hasNature || ctx.hasBeach || HOT_MONTHS.has(ctx.month) },
  { id: "insect-repellent", name: "Insect repellent", category: "outdoor", reason: "Summer mosquitoes in nature areas", condition: (ctx) => ctx.hasNature && HOT_MONTHS.has(ctx.month) },

  // --- Tech ---
  { id: "portable-wifi", name: "Pocket WiFi or eSIM", category: "tech", reason: "Navigation, translation, and train apps need data", condition: () => true },
  { id: "power-bank", name: "Power bank", category: "tech", reason: "Long days drain your phone fast", condition: (ctx) => ctx.duration >= 3 },
  { id: "translation-app", name: "Translation app (offline)", category: "tech", reason: "Download Japanese offline. Many signs lack English.", condition: () => true },

  // --- Comfort ---
  { id: "compact-umbrella", name: "Compact umbrella", category: "comfort", reason: "Rain is common year-round in Japan", condition: () => true },
  { id: "packing-cubes", name: "Packing cubes", category: "comfort", reason: "Multi-city trips need organized luggage", condition: (ctx) => ctx.isMultiCity },
  { id: "onsen-towel", name: "Quick-dry towel", category: "comfort", reason: "For onsen visits. Some charge for towels.", condition: (ctx) => ctx.hasOnsen },
  { id: "earplugs", name: "Earplugs", category: "comfort", reason: "Useful for hostels and capsule hotels", condition: (ctx) => ctx.groupType === "solo" },
  { id: "motion-sickness", name: "Motion sickness meds", category: "comfort", reason: "Long shinkansen rides and winding mountain roads", condition: (ctx) => ctx.duration >= 5 && ctx.isMultiCity },

  // --- Food & Drink ---
  { id: "chopstick-skills", name: "Travel chopsticks", category: "food_drink", reason: "Eco-friendly and always handy", condition: (ctx) => ctx.duration >= 5 },
  { id: "snack-bag", name: "Resealable bags for snacks", category: "food_drink", reason: "Japanese treats are great souvenirs", condition: (ctx) => ctx.duration >= 3 },

  // --- Seasonal ---
  { id: "hand-warmers", name: "Disposable hand warmers (kairo)", category: "seasonal", reason: "Cheap in Japan but start with a few for the cold", condition: (ctx) => COLD_MONTHS.has(ctx.month) },
  { id: "cooling-towel", name: "Cooling towel", category: "seasonal", reason: "Summer heat and humidity can be intense", condition: (ctx) => HOT_MONTHS.has(ctx.month) },
  { id: "umbrella-uv", name: "UV parasol", category: "seasonal", reason: "Japanese locals use them. Protects from heat.", condition: (ctx) => HOT_MONTHS.has(ctx.month) },
];

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generate a packing checklist based on trip characteristics.
 */
export function generatePackingChecklist(options: {
  duration: number;
  cities: string[];
  activityCategories: Set<string>;
  month: number;
  groupType?: string;
}): PackingChecklist {
  const ctx: PackingContext = {
    duration: options.duration,
    cities: options.cities,
    activityCategories: options.activityCategories,
    month: options.month,
    hasOnsen: options.activityCategories.has("onsen") || options.activityCategories.has("wellness"),
    hasNature: options.activityCategories.has("nature") || options.activityCategories.has("park") || options.activityCategories.has("viewpoint"),
    hasTemples: options.activityCategories.has("temple") || options.activityCategories.has("shrine"),
    hasBeach: options.activityCategories.has("beach"),
    isMultiCity: options.cities.length >= 2,
    groupType: options.groupType,
  };

  const items: PackingItem[] = [];

  for (const rule of RULES) {
    if (rule.condition(ctx)) {
      items.push({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        reason: rule.reason,
      });
    }
  }

  return { items };
}

/**
 * Group packing items by category for display.
 */
export function groupByCategory(
  items: PackingItem[],
): Map<PackingCategory, PackingItem[]> {
  const groups = new Map<PackingCategory, PackingItem[]>();
  for (const item of items) {
    const group = groups.get(item.category) ?? [];
    group.push(item);
    groups.set(item.category, group);
  }
  return groups;
}
