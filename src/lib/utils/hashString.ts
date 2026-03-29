/**
 * Simple deterministic string hash (djb2 variant).
 * Used for consistent fallback generation (ratings, review counts, etc.).
 */
export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
