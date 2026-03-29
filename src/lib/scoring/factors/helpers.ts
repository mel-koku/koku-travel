import type { Location } from "@/types/location";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";

/**
 * Get location duration in minutes.
 * Reuses logic from itineraryGenerator.ts
 */
export function getLocationDurationMinutes(location: Location): number {
  // Prefer structured recommendation
  if (location.recommendedVisit?.typicalMinutes) {
    return location.recommendedVisit.typicalMinutes;
  }

  // Parse estimatedDuration string
  if (location.estimatedDuration) {
    const match = location.estimatedDuration.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)/i);
    if (match) {
      const hours = parseFloat(match[1] ?? "1");
      return Math.round(hours * 60);
    }
  }

  // Use category-based default
  if (location.category) {
    return getCategoryDefaultDuration(location.category);
  }

  // Default fallback
  return 90;
}
