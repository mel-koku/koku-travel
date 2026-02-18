/**
 * Normalize a string key for case-insensitive lookups.
 */
export function normalizeKey(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
