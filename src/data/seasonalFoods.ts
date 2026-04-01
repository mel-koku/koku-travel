/**
 * Seasonal Food Calendar
 *
 * ~40 seasonal foods by month, city, and category.
 * Used for "In season" badges on restaurant activities and DayTips pro tips.
 */

export type FoodCategory = "seafood" | "fruit" | "sweet" | "dish" | "vegetable";

export interface SeasonalFood {
  id: string;
  name: string;
  nameJa: string;
  months: number[]; // 1-12
  cities: string[]; // KnownCityId or "all" for nationwide
  category: FoodCategory;
  description: string;
}

export const SEASONAL_FOODS: readonly SeasonalFood[] = [
  // --- Spring (March–May) ---
  { id: "sakura-mochi", name: "Sakura Mochi", nameJa: "桜餅", months: [3, 4], cities: ["all"], category: "sweet", description: "Pink rice cake wrapped in pickled cherry leaf" },
  { id: "takenoko", name: "Bamboo Shoots", nameJa: "筍", months: [3, 4, 5], cities: ["kyoto", "kanazawa"], category: "vegetable", description: "Spring bamboo shoots. Grilled or in rice" },
  { id: "hotaru-ika", name: "Firefly Squid", nameJa: "ホタルイカ", months: [3, 4, 5], cities: ["kanazawa", "toyama"], category: "seafood", description: "Bioluminescent squid from Toyama Bay" },
  { id: "shirasu", name: "Whitebait", nameJa: "しらす", months: [3, 4, 5], cities: ["kamakura", "all"], category: "seafood", description: "Tiny translucent fish. Raw or lightly boiled" },
  { id: "ichigo-daifuku", name: "Strawberry Daifuku", nameJa: "いちご大福", months: [1, 2, 3, 4], cities: ["all"], category: "sweet", description: "Fresh strawberry wrapped in mochi and red bean" },

  // --- Summer (June–August) ---
  { id: "hamo", name: "Pike Eel", nameJa: "鱧", months: [6, 7, 8], cities: ["kyoto", "osaka"], category: "seafood", description: "Gion Festival delicacy. Blanched and served with plum" },
  { id: "uni", name: "Sea Urchin", nameJa: "ウニ", months: [6, 7, 8], cities: ["hokkaido", "all"], category: "seafood", description: "Peak season uni. Creamy and sweet from Hokkaido" },
  { id: "kakigori", name: "Shaved Ice", nameJa: "かき氷", months: [6, 7, 8, 9], cities: ["all"], category: "sweet", description: "Fluffy shaved ice with syrup. Summer essential" },
  { id: "nagashi-somen", name: "Flowing Somen", nameJa: "流しそうめん", months: [7, 8], cities: ["all"], category: "dish", description: "Chilled noodles caught from a bamboo slide" },
  { id: "edamame", name: "Edamame", nameJa: "枝豆", months: [6, 7, 8], cities: ["all"], category: "vegetable", description: "Fresh young soybeans. A summer beer snack" },
  { id: "momo", name: "White Peach", nameJa: "桃", months: [7, 8], cities: ["okayama", "fukushima", "all"], category: "fruit", description: "Japanese white peaches. Incredibly juicy" },
  { id: "ayu", name: "Sweetfish", nameJa: "鮎", months: [6, 7, 8], cities: ["kyoto", "gifu", "all"], category: "seafood", description: "River fish grilled on charcoal skewers" },
  { id: "unagi", name: "Freshwater Eel", nameJa: "鰻", months: [7, 8], cities: ["all"], category: "dish", description: "Eaten on Doyo no Ushi no Hi for summer stamina" },

  // --- Autumn (September–November) ---
  { id: "sanma", name: "Pacific Saury", nameJa: "秋刀魚", months: [9, 10, 11], cities: ["all"], category: "seafood", description: "Salt-grilled with grated daikon. The taste of autumn" },
  { id: "matsutake", name: "Matsutake Mushroom", nameJa: "松茸", months: [9, 10, 11], cities: ["kyoto", "all"], category: "vegetable", description: "Prized wild mushroom. Fragrant and expensive" },
  { id: "kuri", name: "Chestnuts", nameJa: "栗", months: [9, 10, 11], cities: ["all"], category: "sweet", description: "Roasted, in rice, or as mont blanc dessert" },
  { id: "shine-muscat", name: "Shine Muscat Grape", nameJa: "シャインマスカット", months: [8, 9, 10], cities: ["yamanashi", "all"], category: "fruit", description: "Premium seedless grape. Crisp and intensely sweet" },
  { id: "kaki", name: "Persimmon", nameJa: "柿", months: [10, 11, 12], cities: ["nara", "all"], category: "fruit", description: "Sweet fuyu or astringent hachiya varieties" },
  { id: "saba", name: "Mackerel", nameJa: "鯖", months: [10, 11, 12], cities: ["all"], category: "seafood", description: "Autumn mackerel. Fatty and rich" },
  { id: "kinoko", name: "Mixed Mushrooms", nameJa: "きのこ", months: [9, 10, 11], cities: ["all"], category: "vegetable", description: "Shimeji, maitake, enoki. In hot pot or grilled" },
  { id: "sweet-potato", name: "Roasted Sweet Potato", nameJa: "焼き芋", months: [10, 11, 12], cities: ["all"], category: "sweet", description: "Street vendor yakiimo. Caramelized and creamy" },

  // --- Winter (December–February) ---
  { id: "fugu", name: "Pufferfish", nameJa: "ふぐ", months: [11, 12, 1, 2], cities: ["osaka", "shimonoseki", "all"], category: "seafood", description: "Licensed chefs prepare this winter delicacy" },
  { id: "kani", name: "Snow Crab", nameJa: "蟹", months: [11, 12, 1, 2, 3], cities: ["kanazawa", "hokkaido", "all"], category: "seafood", description: "Zuwai-gani. Boiled, grilled, or as sashimi" },
  { id: "buri", name: "Yellowtail", nameJa: "ブリ", months: [12, 1, 2], cities: ["kanazawa", "hokkaido", "all"], category: "seafood", description: "Winter yellowtail. Rich and buttery" },
  { id: "nabe", name: "Hot Pot", nameJa: "鍋", months: [11, 12, 1, 2], cities: ["all"], category: "dish", description: "Communal hot pot. Countless regional variations" },
  { id: "oden", name: "Oden", nameJa: "おでん", months: [10, 11, 12, 1, 2], cities: ["all"], category: "dish", description: "Slow-simmered fish cake stew from konbini or specialty shops" },
  { id: "mikan", name: "Mikan Mandarin", nameJa: "みかん", months: [11, 12, 1, 2], cities: ["all"], category: "fruit", description: "The quintessential winter fruit. Sweet and easy to peel" },
  { id: "strawberry", name: "Strawberry", nameJa: "いちご", months: [12, 1, 2, 3, 4], cities: ["all"], category: "fruit", description: "Japanese strawberries peak in winter. Try ichigo-gari picking" },
  { id: "ozoni", name: "Ozoni New Year Soup", nameJa: "お雑煮", months: [1], cities: ["all"], category: "dish", description: "Mochi soup with regional variations. A New Year tradition" },
  { id: "anko-nabe", name: "Monkfish Hot Pot", nameJa: "あんこう鍋", months: [11, 12, 1, 2], cities: ["ibaraki", "all"], category: "dish", description: "Rich collagen-packed monkfish stew" },

  // --- Regional Specialties (year-round but peak season noted) ---
  { id: "wagyu", name: "Wagyu Beef", nameJa: "和牛", months: [10, 11, 12, 1, 2], cities: ["kobe", "matsusaka", "all"], category: "dish", description: "Japanese marbled beef. Best in cooler months" },
  { id: "ramen-hokkaido", name: "Miso Ramen", nameJa: "味噌ラーメン", months: [11, 12, 1, 2, 3], cities: ["hokkaido"], category: "dish", description: "Sapporo's rich miso ramen warms winter nights" },
  { id: "momiji-manju", name: "Momiji Manju", nameJa: "もみじ饅頭", months: [10, 11], cities: ["hiroshima"], category: "sweet", description: "Maple-leaf shaped cakes. Miyajima's signature sweet" },
  { id: "yatsuhashi", name: "Yatsuhashi", nameJa: "八ツ橋", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], cities: ["kyoto"], category: "sweet", description: "Kyoto's cinnamon-dusted mochi triangle. Year-round staple" },
  { id: "mentaiko", name: "Mentaiko", nameJa: "明太子", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], cities: ["fukuoka"], category: "seafood", description: "Spicy pollock roe. Fukuoka's iconic flavor" },
  { id: "takoyaki", name: "Takoyaki", nameJa: "たこ焼き", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], cities: ["osaka"], category: "dish", description: "Osaka's crispy-outside, gooey-inside octopus balls" },
  { id: "soba-nagano", name: "Shinshu Soba", nameJa: "信州そば", months: [10, 11, 12], cities: ["nagano", "matsumoto"], category: "dish", description: "Fresh buckwheat noodles from Nagano's highlands" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESTAURANT_CATEGORIES = new Set([
  "restaurant", "cafe", "bar", "market",
]);

/**
 * Get seasonal foods available for a given month and optional city.
 */
export function getSeasonalFoods(month: number, city?: string): SeasonalFood[] {
  return SEASONAL_FOODS.filter(
    (f) =>
      f.months.includes(month) &&
      (f.cities.includes("all") || (city && f.cities.includes(city)))
  );
}

/**
 * Get seasonal foods relevant to a restaurant activity.
 * Returns top 2-3 items matching the month and city.
 */
export function getSeasonalFoodsForActivity(
  month: number,
  city: string,
  category: string
): SeasonalFood[] {
  if (!RESTAURANT_CATEGORIES.has(category)) return [];

  const foods = SEASONAL_FOODS.filter(
    (f) =>
      f.months.includes(month) &&
      (f.cities.includes(city) || f.cities.includes("all"))
  );

  // Prioritize city-specific foods over "all"
  const sorted = [...foods].sort((a, b) => {
    const aLocal = a.cities.includes(city) ? 1 : 0;
    const bLocal = b.cities.includes(city) ? 1 : 0;
    return bLocal - aLocal;
  });

  return sorted.slice(0, 3);
}

/**
 * Format seasonal foods for display as a tip string.
 */
export function formatSeasonalFoodTip(foods: SeasonalFood[]): string {
  if (foods.length === 0) return "";
  return foods.map((f) => `${f.name} (${f.nameJa})`).join(", ");
}
