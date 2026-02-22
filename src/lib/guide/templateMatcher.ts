/**
 * Template matcher with fallback-chain lookup.
 * Builds a Map<key, Template[]> at module load for O(1) lookups.
 * When multiple templates match, picks deterministically using a seed hash.
 */

import type {
  DayIntroTemplate,
  TransitionTemplate,
  CulturalMomentTemplate,
  PracticalTipTemplate,
  DaySummaryTemplate,
  TripOverviewTemplate,
  ResolvedCategory,
} from "@/types/itineraryGuide";
import { getParentCategoryForDatabaseCategory } from "@/data/categoryHierarchy";

// ── Deterministic hash for consistent random picks ──────────────────

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ── Generic index + lookup ──────────────────────────────────────────

type HasKey = { key: string };

/**
 * Build a Map from key → array of templates.
 * Each template's key is split to also index partial keys using "any" wildcards.
 */
function buildIndex<T extends HasKey>(templates: T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const t of templates) {
    const existing = index.get(t.key);
    if (existing) {
      existing.push(t);
    } else {
      index.set(t.key, [t]);
    }
  }
  return index;
}

/**
 * Lookup a template using a fallback chain of keys.
 * Returns the first match found. If multiple templates share the same key,
 * picks one deterministically using the seed.
 */
function lookup<T extends HasKey>(
  index: Map<string, T[]>,
  fallbackKeys: string[],
  seed: string,
): T | null {
  for (const key of fallbackKeys) {
    const matches = index.get(key);
    if (matches && matches.length > 0) {
      const pick = hashString(seed) % matches.length;
      return matches[pick]!;
    }
  }
  return null;
}

// ── Category resolution from activity tags ──────────────────────────

const TAG_TO_PARENT: Record<string, string> = {
  cultural: "culture",
  dining: "food",
  nature: "nature",
  shopping: "shopping",
  scenic: "view",
  nightlife: "food",
  wellness: "nature",
  adventure: "nature",
  spiritual: "culture",
  artistic: "culture",
  local: "culture",
  historical: "culture",
};

/**
 * Resolve an activity's parent + sub category from its tags array.
 * Tags are built by buildTags(): [interestTag, categoryTag].
 * The categoryTag maps directly to DATABASE_CATEGORY_TO_PARENT.
 *
 * Prefers specific sub-categories (e.g., "park") over generic parent-level
 * tags (e.g., "nature") by collecting all matches and picking the most specific.
 */
export function resolveActivityCategory(
  tags: string[] | undefined,
): ResolvedCategory | null {
  if (!tags || tags.length === 0) return null;

  // Collect all database-level matches
  const dbMatches: ResolvedCategory[] = [];
  for (const tag of tags) {
    const parent = getParentCategoryForDatabaseCategory(tag);
    if (parent) {
      dbMatches.push({ sub: tag, parent });
    }
  }

  // Prefer the match where sub !== parent (specific sub-category like "park")
  // over generic parent-level tags (like "nature" → { sub: "nature", parent: "nature" })
  if (dbMatches.length > 0) {
    const specific = dbMatches.find((m) => m.sub !== m.parent);
    return specific ?? dbMatches[0]!;
  }

  // Fall back to interest-level tag mapping
  for (const tag of tags) {
    const parent = TAG_TO_PARENT[tag];
    if (parent) {
      return { sub: tag, parent };
    }
  }

  return null;
}

// ── Season helper ───────────────────────────────────────────────────

export { getSeason } from "@/lib/utils/seasonUtils";

// ── Day position helper ─────────────────────────────────────────────

export function getDayPosition(
  dayIndex: number,
  totalDays: number,
): string {
  if (totalDays <= 1) return "only";
  if (dayIndex === 0) return "first";
  if (dayIndex === totalDays - 1) return "last";
  return "middle";
}

// ── Day intro lookup ────────────────────────────────────────────────

let dayIntroIndex: Map<string, DayIntroTemplate[]> | null = null;

export function initDayIntroIndex(templates: DayIntroTemplate[]) {
  dayIntroIndex = buildIndex(templates);
}

export function matchDayIntro(
  city: string,
  firstCategory: string,
  season: string,
  position: string,
  seed: string,
): DayIntroTemplate | null {
  if (!dayIntroIndex) return null;
  const c = city.toLowerCase();
  const cat = firstCategory.toLowerCase();

  const fallbackKeys = [
    `${c}:${cat}:${season}:${position}`,
    `${c}:${cat}:${season}:any`,
    `${c}:${cat}:any:${position}`,
    `${c}:${cat}:any:any`,
    `${c}:any:${season}:${position}`,
    `${c}:any:any:any`,
    `generic:${cat}:${season}:${position}`,
    `generic:${cat}:${season}:any`,
    `generic:${cat}:any:any`,
    `generic:any:${season}:any`,
    `generic:any:any:any`,
  ];

  return lookup(dayIntroIndex, fallbackKeys, seed);
}

// ── Transition lookup ───────────────────────────────────────────────

let transitionIndex: Map<string, TransitionTemplate[]> | null = null;

export function initTransitionIndex(templates: TransitionTemplate[]) {
  transitionIndex = buildIndex(templates);
}

export function matchTransition(
  fromParent: string,
  toParent: string,
  city: string,
  seed: string,
): TransitionTemplate | null {
  if (!transitionIndex) return null;
  const f = fromParent.toLowerCase();
  const t = toParent.toLowerCase();
  const c = city.toLowerCase();

  const fallbackKeys = [
    `${f}:${t}:${c}`,
    `${f}:${t}:any`,
    `any:${t}:${c}`,
    `${f}:any:${c}`,
    `any:${t}:any`,
    `${f}:any:any`,
    `any:any:any`,
  ];

  return lookup(transitionIndex, fallbackKeys, seed);
}

// ── Cultural moment lookup ──────────────────────────────────────────

let culturalMomentIndex: Map<string, CulturalMomentTemplate[]> | null = null;

export function initCulturalMomentIndex(templates: CulturalMomentTemplate[]) {
  culturalMomentIndex = buildIndex(templates);
}

export function matchCulturalMoment(
  subCategory: string,
  city: string,
  seed: string,
): CulturalMomentTemplate | null {
  if (!culturalMomentIndex) return null;
  const s = subCategory.toLowerCase();
  const c = city.toLowerCase();

  const fallbackKeys = [
    `${s}:${c}`,
    `${s}:any`,
    `any:${c}`,
    `any:any`,
  ];

  return lookup(culturalMomentIndex, fallbackKeys, seed);
}

// ── Practical tip lookup ────────────────────────────────────────────

let practicalTipIndex: Map<string, PracticalTipTemplate[]> | null = null;

export function initPracticalTipIndex(templates: PracticalTipTemplate[]) {
  practicalTipIndex = buildIndex(templates);
}

export function matchPracticalTip(
  topic: string,
  seed: string,
): PracticalTipTemplate | null {
  if (!practicalTipIndex) return null;

  const fallbackKeys = [topic.toLowerCase(), "any"];

  return lookup(practicalTipIndex, fallbackKeys, seed);
}

// ── Day summary lookup ──────────────────────────────────────────────

let daySummaryIndex: Map<string, DaySummaryTemplate[]> | null = null;

export function initDaySummaryIndex(templates: DaySummaryTemplate[]) {
  daySummaryIndex = buildIndex(templates);
}

export function matchDaySummary(
  city: string,
  vibe: string,
  seed: string,
): DaySummaryTemplate | null {
  if (!daySummaryIndex) return null;
  const c = city.toLowerCase();
  const v = vibe.toLowerCase();

  const fallbackKeys = [
    `${c}:${v}`,
    `${c}:any`,
    `generic:${v}`,
    `generic:any`,
  ];

  return lookup(daySummaryIndex, fallbackKeys, seed);
}

// ── Trip overview lookup ────────────────────────────────────────────

let tripOverviewIndex: Map<string, TripOverviewTemplate[]> | null = null;

export function initTripOverviewIndex(templates: TripOverviewTemplate[]) {
  tripOverviewIndex = buildIndex(templates);
}

export function matchTripOverview(
  cities: string[],
  season: string,
  seed: string,
): TripOverviewTemplate | null {
  if (!tripOverviewIndex) return null;
  const sortedCities = [...cities].map((c) => c.toLowerCase()).sort();
  const cityKey = sortedCities.join("+");

  const fallbackKeys = [
    `${cityKey}:${season}`,
    `${cityKey}:any`,
    `generic:${season}`,
    `generic:any`,
  ];

  return lookup(tripOverviewIndex, fallbackKeys, seed);
}

// ── Determine dominant vibe for a day ───────────────────────────────

export function getDayVibe(
  parentCategories: string[],
): string {
  if (parentCategories.length === 0) return "mixed";

  const counts: Record<string, number> = {};
  for (const cat of parentCategories) {
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]!;
  const second = sorted[1];

  // If the top category doesn't have a clear lead (tied with second), it's mixed
  if (second && top[1] === second[1]) return "mixed";

  if (top[0] === "culture") return "cultural";
  if (top[0] === "food") return "food-focused";
  if (top[0] === "nature") return "nature";
  if (top[0] === "shopping") return "shopping";
  return "mixed";
}

// ── Determine practical tip topic from activities ───────────────────

export const CATEGORY_TO_TIP_TOPIC: Record<string, string> = {
  shrine: "shrine-etiquette",
  temple: "temple-etiquette",
  onsen: "onsen-etiquette",
  restaurant: "dining-etiquette",
  cafe: "convenience-store",
  market: "cash",
  mall: "tax-free",
  street: "tax-free",
  park: "station-navigation",
  garden: "station-navigation",
  viewpoint: "station-navigation",
  beach: "convenience-store",
  mountain: "convenience-store",
  bar: "nightlife",
  museum: "ic-card",
  landmark: "ic-card",
};

export function getTipTopicForDay(subCategories: string[]): string {
  // Return first matching topic, prioritizing cultural categories
  for (const sub of subCategories) {
    const topic = CATEGORY_TO_TIP_TOPIC[sub];
    if (topic) return topic;
  }
  return "ic-card"; // Default practical tip
}

// ── Phrase pools for composed guide content ──────────────────────────

const CITY_SPECIFIC_OPENERS: Record<string, string[]> = {
  kyoto: [
    "Kyoto today.",
    "The ancient capital.",
    "Kyoto — temples, tea, and quiet streets.",
  ],
  osaka: [
    "Osaka today.",
    "Osaka — loud, warm, and well-fed.",
    "Japan's kitchen.",
  ],
  tokyo: [
    "Tokyo today.",
    "Tokyo — where every neighborhood is a different city.",
    "The big one.",
  ],
  nara: [
    "Nara today.",
    "Nara — ancient, compact, deer everywhere.",
  ],
  kobe: [
    "Kobe today.",
    "Kobe — harbor, hills, and good beef.",
  ],
  hiroshima: [
    "Hiroshima today.",
    "Hiroshima — forward-looking, worth the weight.",
  ],
  fukuoka: [
    "Fukuoka today.",
    "Fukuoka — Kyushu's easygoing capital.",
  ],
  kanazawa: [
    "Kanazawa today.",
    "Kanazawa — gardens, gold leaf, and fresh crab.",
  ],
};

export const DAY_INTRO_OPENERS: string[] = [
  "{city} today.",
  "A new day in {city}.",
  "{city} — here's the plan.",
  "Morning in {city}.",
  "{city}, day ahead.",
];

export const TRANSITION_BRIDGES: string[] = [
  "{name} is next",
  "From here, {name}",
  "Then, {name}",
  "On to {name}",
  "{name} after this",
  "Heading to {name}",
  "Not far from here: {name}",
];

export const SUMMARY_OPENERS: string[] = [
  "That's {city} for today.",
  "{city}, done.",
  "Day's done.",
  "That wraps {city}.",
  "{city}, covered.",
];

/**
 * Pick a phrase deterministically from a pool using a seed hash.
 * Supports {variable} interpolation with the provided vars.
 */
export function pickPhrase(
  phrases: string[],
  seed: string,
  vars?: Record<string, string>,
): string {
  if (phrases.length === 0) return "";
  const idx = hashString(seed) % phrases.length;
  let phrase = phrases[idx]!;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      phrase = phrase.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }
  return phrase;
}

/**
 * Get a day intro opener, preferring city-specific variants when available.
 */
export function pickDayIntroOpener(city: string, seed: string): string {
  const cityKey = city.toLowerCase();
  const cityPhrases = CITY_SPECIFIC_OPENERS[cityKey];
  if (cityPhrases && cityPhrases.length > 0) {
    // Mix city-specific and generic openers (favor city-specific)
    const idx = hashString(seed) % (cityPhrases.length + 1);
    if (idx < cityPhrases.length) {
      return cityPhrases[idx]!;
    }
  }
  // Fall back to generic opener with city name interpolated
  const displayCity = capitalize(city);
  return pickPhrase(DAY_INTRO_OPENERS, seed, { city: displayCity });
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
