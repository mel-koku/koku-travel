/**
 * Night Activity Data
 *
 * ~15 evening activity types with city relevance scores.
 * Used for evening_free gap detection suggestions.
 */

import type { KnownCityId } from "@/types/trip";

export interface NightActivity {
  id: string;
  name: string;
  nameJa: string;
  category: string;
  description: string;
  /** City relevance scores (0-10). Higher = more relevant in that city. */
  cityRelevance: Partial<Record<KnownCityId, number>>;
  /** Default relevance for cities not explicitly listed */
  defaultRelevance: number;
  /** Latest reasonable start time (24h) */
  latestStart: string;
  /** Typical duration in minutes */
  typicalDuration: number;
}

export const NIGHT_ACTIVITIES: readonly NightActivity[] = [
  {
    id: "izakaya",
    name: "Izakaya Hopping",
    nameJa: "居酒屋",
    category: "bar",
    description: "Japanese pub-style dining with small plates and drinks",
    cityRelevance: { tokyo: 9, osaka: 10, fukuoka: 9, kyoto: 7, sapporo: 8 },
    defaultRelevance: 7,
    latestStart: "21:00",
    typicalDuration: 120,
  },
  {
    id: "night-view",
    name: "Night View",
    nameJa: "夜景",
    category: "viewpoint",
    description: "City skyline or illuminated landmarks from a high vantage point",
    cityRelevance: { tokyo: 10, osaka: 9, yokohama: 9, kobe: 9, nagoya: 7, fukuoka: 7, sapporo: 8 },
    defaultRelevance: 4,
    latestStart: "22:00",
    typicalDuration: 60,
  },
  {
    id: "late-night-ramen",
    name: "Late-Night Ramen",
    nameJa: "夜ラーメン",
    category: "restaurant",
    description: "Hot bowl of ramen to end the night — many shops open until 2am",
    cityRelevance: { tokyo: 9, osaka: 8, fukuoka: 10, sapporo: 9, kyoto: 6 },
    defaultRelevance: 6,
    latestStart: "23:00",
    typicalDuration: 45,
  },
  {
    id: "karaoke",
    name: "Karaoke",
    nameJa: "カラオケ",
    category: "entertainment",
    description: "Sing your heart out in a private room — open late everywhere",
    cityRelevance: { tokyo: 9, osaka: 9, fukuoka: 8 },
    defaultRelevance: 7,
    latestStart: "23:00",
    typicalDuration: 120,
  },
  {
    id: "game-center",
    name: "Arcade / Game Center",
    nameJa: "ゲームセンター",
    category: "entertainment",
    description: "UFO catchers, rhythm games, and retro cabinets",
    cityRelevance: { tokyo: 10, osaka: 8 },
    defaultRelevance: 5,
    latestStart: "22:00",
    typicalDuration: 90,
  },
  {
    id: "bar-hopping",
    name: "Bar Hopping",
    nameJa: "バー巡り",
    category: "bar",
    description: "Explore standing bars, whisky bars, or cocktail spots",
    cityRelevance: { tokyo: 9, osaka: 8, kyoto: 7, kanazawa: 6 },
    defaultRelevance: 5,
    latestStart: "22:00",
    typicalDuration: 120,
  },
  {
    id: "night-market",
    name: "Night Food Stalls",
    nameJa: "屋台",
    category: "market",
    description: "Open-air yatai food stalls — Fukuoka's famous night scene",
    cityRelevance: { fukuoka: 10, osaka: 7 },
    defaultRelevance: 2,
    latestStart: "22:00",
    typicalDuration: 90,
  },
  {
    id: "onsen-sento",
    name: "Evening Onsen / Sento",
    nameJa: "温泉・銭湯",
    category: "onsen",
    description: "Relax in a hot spring bath before bed — many open until 23:00",
    cityRelevance: { hakone: 10, tokyo: 7, osaka: 6, kyoto: 6, sapporo: 9 },
    defaultRelevance: 5,
    latestStart: "21:00",
    typicalDuration: 90,
  },
  {
    id: "illumination",
    name: "Illumination Walk",
    nameJa: "イルミネーション",
    category: "landmark",
    description: "Seasonal light displays — especially stunning Oct–Feb",
    cityRelevance: { tokyo: 8, osaka: 7, kobe: 9 },
    defaultRelevance: 4,
    latestStart: "21:00",
    typicalDuration: 60,
  },
  {
    id: "river-cruise",
    name: "Evening River Cruise",
    nameJa: "ナイトクルーズ",
    category: "entertainment",
    description: "See the city from the water — illuminated bridges and skyline",
    cityRelevance: { tokyo: 7, osaka: 8 },
    defaultRelevance: 2,
    latestStart: "20:00",
    typicalDuration: 60,
  },
  {
    id: "standing-sushi",
    name: "Standing Sushi Bar",
    nameJa: "立ち食い寿司",
    category: "restaurant",
    description: "Quick, fresh sushi at the counter — no reservation needed",
    cityRelevance: { tokyo: 9, osaka: 7 },
    defaultRelevance: 4,
    latestStart: "21:00",
    typicalDuration: 45,
  },
  {
    id: "yokocho",
    name: "Yokocho Alley",
    nameJa: "横丁",
    category: "bar",
    description: "Narrow drinking alleys with tiny bars — atmospheric and unique",
    cityRelevance: { tokyo: 10, osaka: 8 },
    defaultRelevance: 3,
    latestStart: "22:00",
    typicalDuration: 90,
  },
  {
    id: "temple-night",
    name: "Night Temple Visit",
    nameJa: "夜間拝観",
    category: "temple",
    description: "Special evening openings with illuminated grounds",
    cityRelevance: { kyoto: 9, nara: 6 },
    defaultRelevance: 2,
    latestStart: "20:00",
    typicalDuration: 60,
  },
  {
    id: "don-quijote",
    name: "Don Quijote Shopping",
    nameJa: "ドン・キホーテ",
    category: "shopping",
    description: "Discount store open until late — souvenirs, snacks, electronics",
    cityRelevance: { tokyo: 8, osaka: 8 },
    defaultRelevance: 6,
    latestStart: "23:00",
    typicalDuration: 60,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get top evening activity suggestions for a city.
 * Returns sorted by relevance, filtered by latest start time.
 */
export function getEveningSuggestions(
  cityId: string,
  maxResults: number = 3,
): NightActivity[] {
  const knownCity = cityId as KnownCityId;

  return [...NIGHT_ACTIVITIES]
    .sort((a, b) => {
      const aScore = a.cityRelevance[knownCity] ?? a.defaultRelevance;
      const bScore = b.cityRelevance[knownCity] ?? b.defaultRelevance;
      return bScore - aScore;
    })
    .slice(0, maxResults);
}

/**
 * Format evening suggestions for display.
 */
export function formatEveningSuggestions(activities: NightActivity[]): string {
  return activities.map((a) => a.name).join(", ");
}
