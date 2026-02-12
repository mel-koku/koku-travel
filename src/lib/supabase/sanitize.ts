/**
 * Escapes special characters in values used in PostgREST `.or()` / `.ilike()` filters
 * to prevent filter injection via user-supplied strings.
 *
 * PostgREST interprets characters like `%`, `*`, `(`, `)`, `.`, `,`, `"`, and `\`
 * as filter syntax — unescaped user input could alter query semantics.
 */
export function escapePostgrestValue(value: string): string {
  return value.replace(/[%*().,"\\]/g, (ch) => `\\${ch}`);
}
