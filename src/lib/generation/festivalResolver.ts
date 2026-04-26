/**
 * Festival auto-include resolver.
 *
 * Given a list of `mustIncludeFestivals` IDs, the trip dates, and the candidate
 * locations, this returns either:
 *  - a pinned-location entry (festival.suggestedActivity matched a real Location), or
 *  - a fallback note-activity payload to inject on the matching day.
 *
 * Consumed by `generateItinerary()` after the LLM-pinned map is built.
 *
 * Region-keyed festivals (e.g. `kanto`, `kyushu`) are silently skipped — we'd
 * have nowhere coherent to drop the note. The skip is logged once per process.
 */

import { logger } from "@/lib/logger";
import type { Location } from "@/types/location";
import { FESTIVALS, type Festival } from "@/data/festivalCalendar";
import { REGIONS } from "@/data/regions";
import { parseLocalDateWithOffset } from "@/lib/utils/dateUtils";

/** Region IDs that may appear as `Festival.city` values (e.g. "kanto"). */
const REGION_IDS: ReadonlySet<string> = new Set(REGIONS.map((r) => r.id));

/**
 * One-time per-process warn dedup. Resets only via the test helper below so
 * a single deny-listed festival doesn't spam logs across every generation.
 */
const warnedFestivalIds = new Set<string>();

/** Test helper: clears the once-per-process warn dedup. */
export function __resetWarnedFestivalsForTests(): void {
  warnedFestivalIds.clear();
}

export type ResolvedFestivalPin = {
  festivalId: string;
  /** Day index (0-based) inside the trip where the festival lands. */
  dayIndex: number;
  /** Resolved location to pin on that day. */
  location: Location;
};

export type ResolvedFestivalNote = {
  festivalId: string;
  dayIndex: number;
  /** City the festival is in (already validated to be a city, not a region). */
  city: string;
  festivalName: string;
  /** Combined description + suggestedActivity for the note body. */
  notes: string;
};

export type FestivalResolution = {
  pins: ResolvedFestivalPin[];
  notes: ResolvedFestivalNote[];
};

/**
 * Compute the first trip-day index where the festival window overlaps AND
 * the day is scheduled in the festival's city. Returns -1 if no day matches.
 *
 * `dayCityKeys` is the per-day city sequence (length === totalDays). When
 * empty, falls back to a window-only match — used for early planning where
 * the city sequence isn't computed yet.
 */
function findFirstOverlappingDayIndex(
  festival: Festival,
  startIso: string,
  totalDays: number,
  dayCityKeys: readonly string[],
): number {
  const cityCheck = dayCityKeys.length > 0;
  const target = festival.city.toLowerCase();
  for (let i = 0; i < totalDays; i++) {
    const date = parseLocalDateWithOffset(startIso, i);
    if (!date) continue;
    if (cityCheck) {
      const dayCity = (dayCityKeys[i] ?? "").toLowerCase();
      if (dayCity !== target) continue;
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (isInFestivalPeriod(month, day, festival)) {
      return i;
    }
  }
  return -1;
}

function isInFestivalPeriod(month: number, day: number, f: Festival): boolean {
  const d = month * 100 + day;
  const s = f.startMonth * 100 + f.startDay;
  const e = f.endMonth * 100 + f.endDay;
  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e;
}

/**
 * Extract capitalised noun-phrase tokens from the festival.suggestedActivity
 * prose. Returns a ranked list of candidates: longest meaningful multi-word
 * phrases first, then individual proper-noun words. The token-resolver
 * walks this list in order and stops at the first matching Location.
 *
 * Stop words are imperative verbs ("Watch", "Visit") and generic nouns
 * ("Festival", "Day") that produce false-positive substring matches.
 */
function extractCapitalisedTokens(text: string): string[] {
  // Match runs of letters/hyphens/apostrophes that begin uppercase, length >=3.
  // Allows Japanese-style hyphenations (Todai-ji, Heian-jingu).
  const matches = text.match(/[A-Z][A-Za-z'\-]{2,}(?:\s+[A-Z][A-Za-z'\-]{2,})*/g);
  if (!matches) return [];

  const STOP_WORDS = new Set([
    // Imperative verbs that lead suggestedActivity strings
    "Visit", "Watch", "Join", "See", "Walk", "Attend", "Enjoy",
    "Explore", "Wake", "Dance", "Experience", "Take", "Try",
    // Generic nouns that produce false substring matches
    "Japan", "Japanese", "Festival", "Matsuri", "Day", "Days", "Night",
    "From", "The", "And", "With",
  ]);

  // Preserve insertion order while deduping.
  const seen = new Set<string>();
  const phrases: string[] = [];
  const words: string[] = [];

  for (const m of matches) {
    const trimmed = m.trim();
    if (!trimmed) continue;

    // Strip leading stop-word verbs from multi-word phrases so
    // "Explore Gion Matsuri" becomes "Gion Matsuri".
    let cleaned = trimmed;
    while (cleaned.includes(" ")) {
      const [first, ...rest] = cleaned.split(" ");
      if (first && STOP_WORDS.has(first)) {
        cleaned = rest.join(" ");
      } else {
        break;
      }
    }

    if (cleaned.includes(" ")) {
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        phrases.push(cleaned);
      }
      // Also emit each capitalised word individually as a fallback,
      // in case the multi-word phrase doesn't match any location.
      for (const w of cleaned.split(" ")) {
        if (w.length >= 3 && !STOP_WORDS.has(w) && !seen.has(w)) {
          seen.add(w);
          words.push(w);
        }
      }
    } else {
      // Single-word match.
      if (cleaned.length >= 3 && !STOP_WORDS.has(cleaned) && !seen.has(cleaned)) {
        seen.add(cleaned);
        words.push(cleaned);
      }
    }
  }

  // Rank: multi-word phrases first (more specific), then individual words.
  return [...phrases, ...words];
}

/**
 * Resolve a token to a Location using the same fuzzy 3-step cascade
 * that the LLM-pinned resolver in itineraryGenerator uses.
 */
function resolveTokenToLocation(token: string, locations: Location[]): Location | undefined {
  const search = token.toLowerCase().trim();
  if (!search) return undefined;
  return (
    locations.find((loc) => loc.name.toLowerCase().trim() === search)
    ?? locations.find((loc) => loc.name.toLowerCase().trim().includes(search))
    ?? locations.find((loc) => search.includes(loc.name.toLowerCase().trim()))
  );
}

/**
 * Resolve every requested festival ID into either a pinned-location entry or
 * a note-activity entry, sorted deterministically by festival start date.
 *
 * Drops:
 *  - festivals whose ID isn't in FESTIVALS (silent)
 *  - festivals whose date window doesn't overlap the trip (silent)
 *  - festivals keyed to a region (warn once per ID per process)
 *  - festivals in cities the user didn't pick (silent)
 */
export function resolveMustIncludeFestivals(
  festivalIds: readonly string[],
  startIso: string | undefined,
  totalDays: number,
  cities: readonly string[],
  candidateLocations: Location[],
  dayCityKeys: readonly string[],
): FestivalResolution {
  if (!startIso || totalDays <= 0 || festivalIds.length === 0) {
    return { pins: [], notes: [] };
  }

  // Collect Festival objects by ID (drop unknown IDs silently), then sort by
  // start date so test 6's "deterministic order by festival start" holds
  // independent of user selection order.
  const requested: Festival[] = [];
  for (const id of festivalIds) {
    const f = FESTIVALS.find((x) => x.id === id);
    if (f) requested.push(f);
  }
  requested.sort((a, b) => {
    if (a.startMonth !== b.startMonth) return a.startMonth - b.startMonth;
    if (a.startDay !== b.startDay) return a.startDay - b.startDay;
    return a.id.localeCompare(b.id);
  });

  const cityList: ReadonlySet<string> = new Set(cities);
  const pins: ResolvedFestivalPin[] = [];
  const notes: ResolvedFestivalNote[] = [];
  const usedLocationIds = new Set<string>();

  for (const festival of requested) {
    // Skip region-keyed festivals — no coherent day to drop a note on.
    if (REGION_IDS.has(festival.city)) {
      if (!warnedFestivalIds.has(festival.id)) {
        warnedFestivalIds.add(festival.id);
        logger.warn(
          `mustIncludeFestivals: dropping region-keyed festival "${festival.id}" (city="${festival.city}") — no specific city to inject into.`,
        );
      }
      continue;
    }

    // Skip festivals in cities the user didn't pick.
    if (cityList.size > 0 && !cityList.has(festival.city)) {
      continue;
    }

    // Compute target day index from festival window ∩ trip dates ∩ city schedule.
    const dayIndex = findFirstOverlappingDayIndex(
      festival, startIso, totalDays, dayCityKeys,
    );
    if (dayIndex < 0) continue;

    // Try to resolve suggestedActivity to a location.
    let resolved: Location | undefined;
    if (festival.suggestedActivity) {
      // Tokens already arrive ranked: multi-word phrases first, then words.
      const tokens = extractCapitalisedTokens(festival.suggestedActivity);
      // Restrict to locations in the festival's city for precision.
      const cityLocations = candidateLocations.filter((loc) => {
        const locCity = (loc.planningCity ?? loc.city ?? "").toLowerCase();
        return locCity === festival.city.toLowerCase();
      });
      const pool = cityLocations.length > 0 ? cityLocations : candidateLocations;
      for (const token of tokens) {
        const match = resolveTokenToLocation(token, pool);
        if (match && !usedLocationIds.has(match.id)) {
          resolved = match;
          break;
        }
      }
    }

    if (resolved) {
      pins.push({ festivalId: festival.id, dayIndex, location: resolved });
      usedLocationIds.add(resolved.id);
      continue;
    }

    // Fallback: dated note-activity. Preserve original suggestedActivity prose.
    if (!warnedFestivalIds.has(festival.id)) {
      warnedFestivalIds.add(festival.id);
      logger.warn(
        `mustIncludeFestivals: no location match for "${festival.id}" — falling back to note activity.`,
      );
    }
    const suggestedActivity = festival.suggestedActivity?.trim() ?? "";
    const description = festival.description.trim();
    const noteBody = suggestedActivity
      ? `${description} ${suggestedActivity}`
      : description;
    notes.push({
      festivalId: festival.id,
      dayIndex,
      city: festival.city,
      festivalName: festival.name,
      notes: noteBody,
    });
  }

  return { pins, notes };
}
