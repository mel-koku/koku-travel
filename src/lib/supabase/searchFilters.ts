import { shouldUseFts, buildIlikeFilter, sanitizeTsQuery } from "./search";

/**
 * Returns true if the query should fall through to semantic search.
 *
 * Fires for any non-trivial free-text query (≥2 chars) without structured
 * intent. Single-word queries benefit too — a misspelled or transliterated
 * place name often maps cleanly to its real entry via embedding similarity.
 *
 * Structured queries (e.g. parsed filters like "shrines in kyoto") skip
 * semantic — the structured path is more precise. Only the free-text fallback
 * uses semantic.
 *
 * Loosened from `wordCount >= 3` (2026-04-30): tightening to multi-word missed
 * the most common typo case (1-word place-name searches).
 */
export function shouldTrySemanticSearch(query: string, hasStructuredIntent: boolean): boolean {
  if (hasStructuredIntent) return false;
  return query.trim().length >= 2;
}

/**
 * Applies text search filtering to a Supabase query.
 *
 * Uses full-text search (FTS) for queries >= 3 chars (supports stemming),
 * and falls back to ILIKE for shorter prefix queries.
 *
 * @param query - The Supabase query builder to apply the filter to
 * @param search - The search string from the user
 * @param columns - Columns to search across with ILIKE fallback
 * @returns The query with the search filter applied
 */
// Generic constraint uses Record to stay compatible with Supabase's
// complex PostgrestFilterBuilder overloads while preserving the return type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase builder generics are too complex to constrain structurally
export function applySearchFilter<T extends Record<string, any>>(
  query: T,
  search: string,
  columns: string[] = ["name", "name_japanese", "city", "region", "category", "cuisine_type", "short_description"],
): T {
  if (shouldUseFts(search)) {
    return query.textSearch("search_vector", sanitizeTsQuery(search), {
      type: "websearch",
      config: "english",
    });
  }
  return query.or(buildIlikeFilter(search, columns));
}
