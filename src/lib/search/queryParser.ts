/**
 * Smart query parser for Places search.
 *
 * Splits a natural-language query like "ramen in fukuoka" into structured
 * intent (category + geography) so the filter can apply precise AND-matching
 * instead of broad substring search across all fields.
 */

import { REGIONS } from "@/data/regions";
import {
  cityToPrefectureMap,
  prefectureToRegionMap,
} from "@/data/prefectures";

// ── Types ──────────────────────────────────────────────

export type ParsedQuery = {
  /** Lowercase geographic terms (city/region/prefecture names) */
  geoTerms: string[];
  /** Database category values to match (OR logic) */
  categories: string[];
  /** Lowercase cuisine keywords to match (OR logic) */
  cuisineTerms: string[];
  /** Remaining unmatched text for name search */
  freeText: string;
  /** True if any structured token was extracted */
  hasStructuredIntent: boolean;
};

// ── Stop words ─────────────────────────────────────────

const STOP_WORDS = new Set([
  "in", "at", "near", "around", "the", "a", "an", "to", "for", "of",
  "and", "or", "with", "spot", "spots", "place", "places", "thing",
  "things", "best", "top", "good", "great", "nice", "cool", "find",
  "show", "me", "i", "want", "looking", "search", "where", "what",
  "some", "any", "try", "visit", "go", "see", "do",
]);

// ── Text normalization ─────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ── Geography lookup ───────────────────────────────────
// Normalized name -> lowercase match term (used to compare against location fields)

const GEO_LOOKUP = new Map<string, string>();

// Regions (id + display name)
for (const region of REGIONS) {
  GEO_LOOKUP.set(normalize(region.name), region.name.toLowerCase());
  GEO_LOOKUP.set(region.id, region.name.toLowerCase());

  // Known cities from REGIONS (id + display name + diacritics-stripped)
  for (const city of region.cities) {
    const norm = normalize(city.name);
    GEO_LOOKUP.set(norm, city.name.toLowerCase());
    GEO_LOOKUP.set(city.id, city.name.toLowerCase());
  }
}

// All cities from prefecture data (~600+ beyond the 35 known)
for (const cityName of cityToPrefectureMap.keys()) {
  const norm = normalize(cityName);
  if (!GEO_LOOKUP.has(norm)) {
    GEO_LOOKUP.set(norm, cityName.toLowerCase());
  }
}

// Prefecture names (e.g. "Kanagawa", "Ishikawa")
for (const prefName of prefectureToRegionMap.keys()) {
  const norm = normalize(prefName);
  if (!GEO_LOOKUP.has(norm)) {
    GEO_LOOKUP.set(norm, prefName.toLowerCase());
  }
}

// ── Category / cuisine keyword map ─────────────────────

type CategoryMatch = {
  categories: string[];
  cuisineTypes?: string[];
};

const KEYWORD_MAP = new Map<string, CategoryMatch>();

const KEYWORDS: Record<string, CategoryMatch> = {
  // ── Culture ──
  temple: { categories: ["temple"] },
  temples: { categories: ["temple"] },
  shrine: { categories: ["shrine"] },
  shrines: { categories: ["shrine"] },
  museum: { categories: ["museum"] },
  museums: { categories: ["museum"] },
  castle: { categories: ["castle"] },
  castles: { categories: ["castle"] },
  landmark: { categories: ["landmark"] },
  landmarks: { categories: ["landmark"] },
  craft: { categories: ["craft"] },
  crafts: { categories: ["craft"] },
  workshop: { categories: ["craft"] },
  workshops: { categories: ["craft"] },
  artisan: { categories: ["craft"] },
  theater: { categories: ["theater"] },
  theatre: { categories: ["theater"] },
  kabuki: { categories: ["theater"] },

  // ── Food (general) ──
  restaurant: { categories: ["restaurant"] },
  restaurants: { categories: ["restaurant"] },
  food: { categories: ["restaurant", "cafe", "market"] },
  dining: { categories: ["restaurant"] },
  eat: { categories: ["restaurant", "cafe"] },
  eating: { categories: ["restaurant", "cafe"] },

  // ── Cuisine types ──
  ramen: { categories: ["restaurant"], cuisineTypes: ["ramen"] },
  sushi: { categories: ["restaurant"], cuisineTypes: ["sushi"] },
  izakaya: { categories: ["restaurant", "bar"], cuisineTypes: ["izakaya"] },
  yakitori: { categories: ["restaurant"], cuisineTypes: ["yakitori"] },
  udon: { categories: ["restaurant"], cuisineTypes: ["udon"] },
  soba: { categories: ["restaurant"], cuisineTypes: ["soba"] },
  tempura: { categories: ["restaurant"], cuisineTypes: ["tempura"] },
  curry: { categories: ["restaurant"], cuisineTypes: ["curry"] },
  kaiseki: { categories: ["restaurant"], cuisineTypes: ["kaiseki"] },
  yakiniku: { categories: ["restaurant"], cuisineTypes: ["yakiniku"] },
  bbq: { categories: ["restaurant"], cuisineTypes: ["yakiniku"] },
  okonomiyaki: { categories: ["restaurant"], cuisineTypes: ["okonomiyaki"] },
  takoyaki: { categories: ["restaurant"], cuisineTypes: ["takoyaki"] },
  tonkatsu: { categories: ["restaurant"], cuisineTypes: ["tonkatsu"] },
  wagyu: { categories: ["restaurant"], cuisineTypes: ["wagyu"] },
  gyudon: { categories: ["restaurant"], cuisineTypes: ["gyudon"] },
  omakase: { categories: ["restaurant"], cuisineTypes: ["omakase"] },
  steak: { categories: ["restaurant"], cuisineTypes: ["steak", "wagyu"] },
  noodles: { categories: ["restaurant"], cuisineTypes: ["ramen", "udon", "soba"] },
  noodle: { categories: ["restaurant"], cuisineTypes: ["ramen", "udon", "soba"] },
  seafood: { categories: ["restaurant"], cuisineTypes: ["sushi", "seafood"] },
  beef: { categories: ["restaurant"], cuisineTypes: ["wagyu", "steak", "beef"] },

  // ── Cafe ──
  cafe: { categories: ["cafe"] },
  cafes: { categories: ["cafe"] },
  coffee: { categories: ["cafe"] },
  bakery: { categories: ["cafe"] },
  dessert: { categories: ["cafe"] },
  desserts: { categories: ["cafe"] },
  sweets: { categories: ["cafe"] },
  tea: { categories: ["cafe"] },

  // ── Bar ──
  bar: { categories: ["bar"] },
  bars: { categories: ["bar"] },
  nightlife: { categories: ["bar", "entertainment"] },
  drinks: { categories: ["bar"] },
  sake: { categories: ["bar"] },
  beer: { categories: ["bar"] },
  pub: { categories: ["bar"] },

  // ── Market ──
  market: { categories: ["market"] },
  markets: { categories: ["market"] },

  // ── Nature ──
  park: { categories: ["park"] },
  parks: { categories: ["park"] },
  garden: { categories: ["garden"] },
  gardens: { categories: ["garden"] },
  nature: { categories: ["nature", "park", "garden", "beach"] },
  hiking: { categories: ["nature", "park"] },
  outdoors: { categories: ["nature", "park", "beach"] },
  outdoor: { categories: ["nature", "park", "beach"] },
  beach: { categories: ["beach"] },
  beaches: { categories: ["beach"] },
  mountain: { categories: ["nature"] },
  mountains: { categories: ["nature"] },
  onsen: { categories: ["onsen"] },
  wellness: { categories: ["wellness"] },

  // ── Shopping ──
  shopping: { categories: ["shopping"] },
  shops: { categories: ["shopping"] },
  store: { categories: ["shopping"] },
  stores: { categories: ["shopping"] },

  // ── View ──
  viewpoint: { categories: ["viewpoint"] },
  viewpoints: { categories: ["viewpoint"] },
  views: { categories: ["viewpoint"] },
  scenic: { categories: ["viewpoint"] },

  // ── Entertainment ──
  entertainment: { categories: ["entertainment"] },
  aquarium: { categories: ["aquarium"] },
  aquariums: { categories: ["aquarium"] },
  zoo: { categories: ["zoo"] },
  zoos: { categories: ["zoo"] },

  // ── Historic ──
  historic: { categories: ["historic_site", "castle", "landmark"] },
  historical: { categories: ["historic_site", "castle", "landmark"] },
  history: { categories: ["historic_site", "castle", "landmark", "museum"] },
};

for (const [keyword, match] of Object.entries(KEYWORDS)) {
  KEYWORD_MAP.set(keyword, match);
}

// Multi-word keywords (checked on the full string before tokenizing)
const MULTI_WORD_KEYWORDS: [string, CategoryMatch][] = [
  ["hot springs", { categories: ["onsen"] }],
  ["hot spring", { categories: ["onsen"] }],
  ["craft workshop", { categories: ["craft"] }],
  ["craft workshops", { categories: ["craft"] }],
  ["shopping street", { categories: ["shopping"] }],
  ["theme park", { categories: ["entertainment"] }],
  ["art gallery", { categories: ["museum"] }],
  ["art galleries", { categories: ["museum"] }],
  ["fine dining", { categories: ["restaurant"], cuisineTypes: ["fine_dining", "kaiseki", "omakase"] }],
];

// ── Parser ─────────────────────────────────────────────

export function parseSearchQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    geoTerms: [],
    categories: [],
    cuisineTerms: [],
    freeText: "",
    hasStructuredIntent: false,
  };

  const trimmed = raw.trim();
  if (!trimmed) return result;

  let remaining = normalize(trimmed);

  // Pass 1: Extract multi-word keywords from the full string
  for (const [phrase, match] of MULTI_WORD_KEYWORDS) {
    if (remaining.includes(phrase)) {
      result.categories.push(...match.categories);
      if (match.cuisineTypes) {
        result.cuisineTerms.push(...match.cuisineTypes);
      }
      remaining = remaining.replace(phrase, " ").replace(/\s+/g, " ").trim();
    }
  }

  // Pass 2: Tokenize and classify remaining words
  const tokens = remaining.split(/\s+/).filter(Boolean);
  const unconsumed: string[] = [];

  for (const token of tokens) {
    // Skip stop words
    if (STOP_WORDS.has(token)) continue;

    // Check geography (city, region, or prefecture)
    const geoMatch = GEO_LOOKUP.get(token);
    if (geoMatch) {
      result.geoTerms.push(geoMatch);
      continue;
    }

    // Check category / cuisine keywords
    const keywordMatch = KEYWORD_MAP.get(token);
    if (keywordMatch) {
      result.categories.push(...keywordMatch.categories);
      if (keywordMatch.cuisineTypes) {
        result.cuisineTerms.push(...keywordMatch.cuisineTypes);
      }
      continue;
    }

    unconsumed.push(token);
  }

  // Remaining tokens become free-text (matched against name)
  result.freeText = unconsumed.join(" ");

  // Deduplicate
  result.geoTerms = [...new Set(result.geoTerms)];
  result.categories = [...new Set(result.categories)];
  result.cuisineTerms = [...new Set(result.cuisineTerms)];

  result.hasStructuredIntent =
    result.geoTerms.length > 0 ||
    result.categories.length > 0 ||
    result.cuisineTerms.length > 0;

  return result;
}
