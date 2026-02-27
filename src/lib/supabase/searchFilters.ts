import { shouldUseFts, buildIlikeFilter, sanitizeTsQuery } from "./search";

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
  columns: string[] = ["name", "city", "region", "category"],
): T {
  if (shouldUseFts(search)) {
    return query.textSearch("search_vector", sanitizeTsQuery(search), {
      type: "websearch",
      config: "english",
    });
  }
  return query.or(buildIlikeFilter(search, columns));
}
