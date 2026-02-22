/**
 * Centralized season logic for the entire app.
 *
 * Consolidates season detection, tag mapping, and seasonal highlight periods
 * previously scattered across templateMatcher.ts, dayIntroGenerator.ts,
 * and locationScoring.ts.
 *
 * GOTCHA: All month extraction uses parseInt(date.split("-")[1], 10)
 * not new Date(date).getMonth() to avoid UTC midnight parsing bug.
 */

// ── Types ────────────────────────────────────────────────────

export type Season = "spring" | "summer" | "fall" | "winter";

// ── Month → Season Tag Mapping ───────────────────────────────

export const MONTH_TO_SEASON_TAGS: Record<number, string[]> = {
  1: ["winter-illumination", "winter-festival"],
  2: ["plum-blossom", "winter-illumination"],
  3: ["cherry-blossom", "plum-blossom"],
  4: ["cherry-blossom"],
  5: ["cherry-blossom"], // Late-blooming areas (Hokkaido)
  6: ["summer-flowers"],
  7: ["summer-flowers", "summer-festival"],
  8: ["summer-festival"],
  9: ["autumn-foliage"],
  10: ["autumn-foliage"],
  11: ["autumn-foliage", "winter-illumination"],
  12: ["winter-illumination", "winter-festival"],
};

/** All recognized seasonal tags on locations. */
const SEASONAL_TAG_SET = new Set([
  "cherry-blossom",
  "autumn-foliage",
  "winter-illumination",
  "summer-flowers",
  "winter-festival",
  "summer-festival",
  "plum-blossom",
  "festival",
  "seasonal",
]);

// ── Core Season Functions ────────────────────────────────────

/**
 * Get season from an ISO date string (yyyy-mm-dd).
 * Returns "any" when no date is provided.
 */
export function getSeason(dateStr?: string | null): string {
  if (!dateStr) return "any";
  const month = parseInt(dateStr.split("-")[1]!, 10);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

/** Get today's season. */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-indexed
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

/** Get current month (1-12). */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/** Get seasonal tags relevant to a given month. */
export function getSeasonalTags(month: number): string[] {
  return MONTH_TO_SEASON_TAGS[month] ?? [];
}

/** True if the month has notable seasonal events (cherry blossom, illuminations, etc). */
export function isSeasonalMonth(month: number): boolean {
  const tags = MONTH_TO_SEASON_TAGS[month];
  return !!tags && tags.length > 0;
}

// ── Display Helpers ──────────────────────────────────────────

/** "spring" → "Spring in Japan" */
export function getSeasonDisplayName(season: Season): string {
  const names: Record<Season, string> = {
    spring: "Spring in Japan",
    summer: "Summer in Japan",
    fall: "Autumn in Japan",
    winter: "Winter in Japan",
  };
  return names[season];
}

const TAG_LABELS: Record<string, string> = {
  "cherry-blossom": "Cherry Blossom",
  "autumn-foliage": "Autumn Foliage",
  "winter-illumination": "Winter Illumination",
  "summer-flowers": "Summer Flowers",
  "winter-festival": "Winter Festival",
  "summer-festival": "Summer Festival",
  "plum-blossom": "Plum Blossom",
};

/** "cherry-blossom" → "Cherry Blossom" */
export function getSeasonalTagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Location Tag Matchers ────────────────────────────────────

/** Does this location's tags include a seasonal tag matching the given month? */
export function locationHasSeasonalTag(tags: string[] | undefined | null, month: number): boolean {
  if (!tags || tags.length === 0) return false;
  const monthTags = MONTH_TO_SEASON_TAGS[month] ?? [];
  return tags.some((t) => monthTags.includes(t));
}

/** Get the first matching seasonal tag label for display, or null. */
export function getLocationSeasonalLabel(tags: string[] | undefined | null, month: number): string | null {
  if (!tags || tags.length === 0) return null;
  const monthTags = MONTH_TO_SEASON_TAGS[month] ?? [];
  const match = tags.find((t) => monthTags.includes(t));
  return match ? getSeasonalTagLabel(match) : null;
}

/** Check if a tag is a recognized seasonal tag. */
export function isSeasonalTag(tag: string): boolean {
  return SEASONAL_TAG_SET.has(tag);
}

// ── Sanity Interop ───────────────────────────────────────────

/** Map our Season to Sanity bestSeason value ("fall" → "autumn"). */
export function seasonToSanityBestSeason(season: Season): string {
  return season === "fall" ? "autumn" : season;
}

// ── Seasonal Highlights (for "What's On Now" banner) ─────────

export type SeasonalHighlight = {
  id: string;
  label: string;
  description: string;
  /** Tags that locations must have to match. */
  matchTags: string[];
  /** Inclusive month range [start, end]. Wraps around for winter. */
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export const SEASONAL_HIGHLIGHTS: SeasonalHighlight[] = [
  {
    id: "cherry-blossom",
    label: "Cherry Blossom Season",
    description: "Sakura is blooming across Japan",
    matchTags: ["cherry-blossom"],
    startMonth: 3,
    startDay: 15,
    endMonth: 5,
    endDay: 10,
  },
  {
    id: "plum-blossom",
    label: "Plum Blossom Season",
    description: "Ume blossoms signal the end of winter",
    matchTags: ["plum-blossom"],
    startMonth: 2,
    startDay: 1,
    endMonth: 3,
    endDay: 20,
  },
  {
    id: "autumn-foliage",
    label: "Autumn Foliage",
    description: "Koyo colors are at their peak",
    matchTags: ["autumn-foliage"],
    startMonth: 9,
    startDay: 15,
    endMonth: 11,
    endDay: 30,
  },
  {
    id: "winter-illumination",
    label: "Winter Illuminations",
    description: "Light displays across the country",
    matchTags: ["winter-illumination"],
    startMonth: 11,
    startDay: 1,
    endMonth: 2,
    endDay: 14,
  },
  {
    id: "summer-festival",
    label: "Summer Festivals",
    description: "Matsuri season is here",
    matchTags: ["summer-festival", "summer-flowers"],
    startMonth: 7,
    startDay: 1,
    endMonth: 8,
    endDay: 31,
  },
];

/** Get the currently active seasonal highlight, or null. */
export function getActiveSeasonalHighlight(): SeasonalHighlight | null {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  for (const highlight of SEASONAL_HIGHLIGHTS) {
    if (isDateInRange(month, day, highlight)) {
      return highlight;
    }
  }
  return null;
}

function isDateInRange(month: number, day: number, h: SeasonalHighlight): boolean {
  const current = month * 100 + day;
  const start = h.startMonth * 100 + h.startDay;
  const end = h.endMonth * 100 + h.endDay;

  // Handle wrap-around (e.g., Nov 1 → Feb 14)
  if (start > end) {
    return current >= start || current <= end;
  }
  return current >= start && current <= end;
}
