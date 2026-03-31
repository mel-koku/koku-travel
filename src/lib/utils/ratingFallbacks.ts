import { hashString } from "./hashString";

/**
 * Generate a deterministic fallback rating (3.9 - 4.8 range)
 * for locations missing Google Places data.
 */
export function generateFallbackRating(locationId: string): number {
  const hash = hashString(locationId);
  return 3.9 + (hash % 18) / 20;
}

/**
 * Generate a deterministic fallback review count (50 - 500 range)
 * for locations missing Google Places data.
 */
export function generateFallbackReviewCount(locationId: string): number {
  const hash = hashString(locationId + "-reviews");
  return 50 + (hash % 450);
}
