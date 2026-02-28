/**
 * Pocket phrase types — short Japanese phrases travelers can say at locations.
 */

export type PhraseCategory =
  | "shrine"
  | "temple"
  | "restaurant"
  | "cafe"
  | "bar"
  | "onsen"
  | "shopping"
  | "station"
  | "hotel"
  | "general";

export type PocketPhrase = {
  japanese: string;
  romaji: string;
  english: string;
  /** Optional situational context (e.g., "When entering") */
  context?: string;
};
