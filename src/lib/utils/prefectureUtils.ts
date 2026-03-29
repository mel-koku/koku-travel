/**
 * Normalize Japanese prefecture names by stripping common suffixes
 * (Prefecture, -ken, -fu, -to).
 */
export function normalizePrefecture(name: string | undefined): string {
  if (!name) return "";
  return name
    .replace(/\s+Prefecture$/i, "")
    .replace(/-ken$/i, "")
    .replace(/-fu$/i, "")
    .replace(/-to$/i, "")
    .trim();
}
