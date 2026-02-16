import { escapePostgrestValue } from "./sanitize";

/** FTS produces poor results below this length; use ILIKE instead */
const FTS_MIN_CHARS = 3;

/** Returns true when the query is long enough for full-text search */
export function shouldUseFts(query: string): boolean {
  return query.trim().length >= FTS_MIN_CHARS;
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
 * Strips characters that can crash `websearch_to_tsquery`.
 * Keeps alphanumeric, spaces, hyphens, and double-quotes (for phrase matching).
 */
export function sanitizeTsQuery(query: string): string {
  return query.replace(/[^\w\s\-"]/g, " ").replace(/\s+/g, " ").trim();
}
