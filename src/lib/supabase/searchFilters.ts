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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySearchFilter<T extends { textSearch: (...args: any[]) => T; or: (...args: any[]) => T }>(
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
