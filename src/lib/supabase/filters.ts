/**
 * Applies standard active-location filters to a Supabase query.
 * Filters to is_active=true and excludes PERMANENTLY_CLOSED businesses.
 *
 * Follows the same generic pattern as applySearchFilter in searchFilters.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase builder generics are too complex to constrain structurally
export function applyActiveLocationFilters<T extends Record<string, any>>(query: T): T {
  return query
    .eq("is_active", true)
    .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED");
}
