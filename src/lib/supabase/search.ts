import { escapePostgrestValue } from "./sanitize";

/** FTS produces poor results below this length; use ILIKE instead */
const FTS_MIN_CHARS = 3;

/**
 * Returns true when the query is suitable for full-text search.
 *
 * FTS is skipped when the query contains non-ASCII characters (e.g.
 * Japanese) because the search_vector column is built with the English
 * tsvector config, which doesn't tokenize CJK. Those queries fall back
 * to ILIKE so they can still match the name_japanese column directly.
 */
export function shouldUseFts(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < FTS_MIN_CHARS) return false;
  // Restrict FTS to ASCII so non-Latin scripts hit the ILIKE path instead.
   
  return !/[^\x00-\x7F]/.test(trimmed);
}

/**
 * Builds a PostgREST `.or()` ILIKE filter string across multiple columns.
 * Each column gets `column.ilike.%query%`.
 */
export function buildIlikeFilter(query: string, columns: string[]): string {
  const escaped = escapePostgrestValue(query);
  return columns.map((col) => `${col}.ilike.%${escaped}%`).join(",");
}

/**
 * Strips characters that would break `websearch_to_tsquery`, while
 * preserving alphanumerics (including Unicode), whitespace, hyphens,
 * and double-quotes (phrase matching). Previously used `\w` which in
 * JS is ASCII-only and blanked out Japanese queries entirely.
 *
 * Callers should additionally gate FTS usage with shouldUseFts() so
 * non-ASCII queries hit the ILIKE path where they can actually match
 * the name_japanese column.
 */
export function sanitizeTsQuery(query: string): string {
  return query.replace(/[^\p{L}\p{N}\s\-"]/gu, " ").replace(/\s+/g, " ").trim();
}
