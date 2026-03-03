/**
 * Escapes special characters in values used in PostgREST `.or()` / `.ilike()` filters
 * to prevent filter injection via user-supplied strings.
 *
 * PostgREST reserved syntax characters:
 *   `.`  — separates column.operator.value
 *   `,`  — separates alternatives in `.or()` / `.in()`
 *   `(`/`)` — group expressions in `.or()` / `.and()`
 *   `:`  — type-cast separator (e.g. `col::text`)
 *   `"`  — quoted identifiers / values
 *   `'`  — string literals in some filter contexts
 *   `\`  — escape character itself
 *   `%`  — LIKE / ILIKE wildcard (any sequence)
 *   `*`  — PostgREST full-text / pattern wildcard
 *
 * All of these are backslash-escaped so user input is treated as literal text.
 */
export function escapePostgrestValue(value: string): string {
  return value.replace(/[%*().,:"'\\]/g, (ch) => `\\${ch}`);
}
