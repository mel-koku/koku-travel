/**
 * Selects 2-3 relevant Japanese pocket phrases for an activity card.
 * Maps location category → phrase category, picks 2 specific + 1 general.
 */

import type { PhraseCategory, PocketPhrase } from "@/types/pocketPhrase";
import { POCKET_PHRASES } from "@/data/pocketPhrases";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";

// ── Category → Phrase category mapping ──────────────────────────────

const CATEGORY_TO_PHRASE: Record<string, PhraseCategory> = {
  // Direct matches
  shrine: "shrine",
  temple: "temple",
  restaurant: "restaurant",
  cafe: "cafe",
  bar: "bar",
  onsen: "onsen",
  shopping: "shopping",

  // Mapped categories
  market: "shopping",
  wellness: "onsen",
  hotel: "hotel",
};

// ── Deterministic hash (DJB2) ───────────────────────────────────────

function hashSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ── Phrase picker ───────────────────────────────────────────────────

function pickN(phrases: PocketPhrase[], n: number, seed: number): PocketPhrase[] {
  if (phrases.length <= n) return phrases;
  const result: PocketPhrase[] = [];
  const used = new Set<number>();
  let s = seed;
  while (result.length < n && used.size < phrases.length) {
    const idx = s % phrases.length;
    if (!used.has(idx)) {
      used.add(idx);
      result.push(phrases[idx]!);
    }
    s = ((s * 31 + 7) | 0) >>> 0;
  }
  return result;
}

/**
 * Select pocket phrases for a location.
 * Returns 2 category-specific + 1 general phrase, or just general if no category match.
 */
export function selectPocketPhrases(
  locationCategory: string | undefined,
  tags: string[] | undefined,
  seed?: string,
): PocketPhrase[] {
  const seedHash = hashSeed(seed ?? locationCategory ?? "default");

  // Resolve phrase category: try direct mapping first, then resolve from tags
  let phraseCategory: PhraseCategory | undefined =
    locationCategory ? CATEGORY_TO_PHRASE[locationCategory] : undefined;

  if (!phraseCategory && tags) {
    const resolved = resolveActivityCategory(tags);
    if (resolved?.sub) {
      phraseCategory = CATEGORY_TO_PHRASE[resolved.sub];
    }
  }

  const generalPhrases = POCKET_PHRASES.general;
  const generalPick = pickN(generalPhrases, 1, seedHash + 99);

  if (!phraseCategory) {
    // No category match — return general-only
    return generalPick;
  }

  const categoryPhrases = POCKET_PHRASES[phraseCategory];
  if (!categoryPhrases || categoryPhrases.length === 0) {
    return generalPick;
  }

  const categoryPicks = pickN(categoryPhrases, 2, seedHash);
  return [...categoryPicks, ...generalPick];
}
