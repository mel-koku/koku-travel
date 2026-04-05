import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";

/**
 * Infer the best timeOfDay slot for a new activity based on existing day activities.
 * Falls back to "morning" if the day is empty.
 */
function inferTimeOfDay(
  existingActivities: ItineraryActivity[],
): "morning" | "afternoon" | "evening" {
  if (existingActivities.length === 0) return "morning";

  const last = existingActivities[existingActivities.length - 1];
  if (!last) return "morning";
  switch (last.timeOfDay) {
    case "morning":
      return "afternoon";
    case "afternoon":
      return "evening";
    case "evening":
      return "evening";
    default:
      return "afternoon";
  }
}

/**
 * Build an ItineraryActivity from a full Location object (no original activity needed).
 * Used when adding a brand-new activity via the location search bar.
 *
 * - `timeOfDay` inferred from existing day activities
 * - Duration from location data or category defaults
 * - No schedule/travel segments (replanning fills those)
 */
export function createActivityFromLocation(
  location: Location,
  existingActivities: ItineraryActivity[],
): Extract<ItineraryActivity, { kind: "place" }> {
  const duration =
    location.recommendedVisit?.typicalMinutes ??
    getCategoryDefaultDuration(location.category ?? "landmark");

  const tags: string[] = [];
  if (location.category) {
    tags.push(location.category);
  }

  return {
    kind: "place",
    id: `${location.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: location.name,
    timeOfDay: inferTimeOfDay(existingActivities),
    durationMin: duration,
    neighborhood: location.neighborhood,
    tags,
    locationId: location.id,
    coordinates: location.coordinates,
    description: location.shortDescription ?? location.description,
  };
}
