import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { TripBuilderData, InterestId } from "@/types/trip";
import type { WeatherForecast } from "@/types/weather";
import { scoreLocation, type LocationScoringCriteria } from "@/lib/scoring/locationScoring";
import { fetchLocationsByCity } from "@/lib/locations/locationService";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { findLocationForActivity, findLocationsForActivities } from "@/lib/itineraryLocations";
import { getCategoryDefaultDuration } from "@/lib/durationExtractor";

export interface ReplacementCandidate {
  location: Location;
  score: number;
  breakdown: {
    interestMatch: number;
    ratingQuality: number;
    logisticalFit: number;
    budgetFit: number;
    accessibilityFit: number;
    diversityBonus: number;
    weatherFit: number;
    timeOptimization: number;
    groupFit: number;
  };
  reasoning: string[];
}

export interface ReplacementOptions {
  candidates: ReplacementCandidate[];
  originalActivity: ItineraryActivity;
}

/**
 * Find replacement candidates for a given activity.
 * Uses the same scoring system as itinerary generation to find similar alternatives.
 * Now queries the database for real location data instead of using mock locations.
 */
export async function findReplacementCandidates(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  tripData: TripBuilderData,
  allActivities: ItineraryActivity[],
  dayActivities: ItineraryActivity[],
  _currentDayIndex: number,
  maxCandidates: number = 10,
  options?: {
    weatherForecast?: WeatherForecast;
    date?: string; // ISO date string for weekday calculation
  },
): Promise<ReplacementOptions> {
  // Get the original location if available
  const originalLocation = await findLocationForActivity(activity);

  // Collect all location IDs already in the itinerary to exclude from suggestions
  const usedLocationIds = new Set<string>();
  for (const act of allActivities) {
    if (act.kind === "place" && act.locationId) {
      usedLocationIds.add(act.locationId);
    }
  }
  // Also exclude the original location being replaced
  if (originalLocation) {
    usedLocationIds.add(originalLocation.id);
  }

  // Extract interests from trip data
  const interests: InterestId[] = tripData.interests ?? [];

  // Get current location coordinates for distance calculation
  const currentCoordinates = getActivityCoordinates(activity);

  // Get recent categories from day activities (excluding current activity)
  // Use batch fetch for efficiency
  const otherDayActivities = dayActivities
    .filter(
      (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
        a.id !== activity.id && a.kind === "place",
    );

  const locationsMap = await findLocationsForActivities(otherDayActivities);

  const recentCategories = otherDayActivities
    .map((a) => {
      const loc = locationsMap.get(a.id);
      return loc?.category ?? "";
    })
    .filter((cat) => cat.length > 0)
    .slice(-5); // Last 5 categories

  // Get activity duration or estimate
  const activityDuration = activity.durationMin ?? 90;

  // Build scoring criteria with enhanced factors
  const criteria: LocationScoringCriteria = {
    interests,
    travelStyle: tripData.style ?? "balanced",
    budgetLevel: tripData.budget?.level,
    budgetTotal: tripData.budget?.total,
    budgetPerDay: tripData.budget?.perDay,
    accessibility: tripData.accessibility?.mobility
      ? {
          wheelchairAccessible: true,
          elevatorRequired: false,
        }
      : undefined,
    currentLocation: currentCoordinates ?? undefined,
    availableMinutes: activityDuration,
    recentCategories,
    weatherForecast: options?.weatherForecast,
    weatherPreferences: tripData.weatherPreferences,
    timeSlot: activity.timeOfDay,
    date: options?.date,
    group: tripData.group,
  };

  // Get the city to filter by (prefer original location's city over neighborhood)
  // activity.neighborhood might contain a neighborhood name (e.g., "Nada-Goro") instead of city
  // so we prioritize originalLocation.city which is the actual city name (e.g., "Kobe")
  const city = originalLocation?.city ?? activity.neighborhood ?? "";

  // Fetch available locations from the database, filtering by city
  // This now queries all 4,385 real locations instead of ~500 mock ones
  // Note: requirePlaceId is false to include locations without Google Places enrichment
  const availableLocations = await fetchLocationsByCity(city, {
    limit: 100, // Get more candidates for better scoring
    excludeIds: Array.from(usedLocationIds), // Exclude all locations already in the itinerary
    requirePlaceId: false,
  });

  // Score all available locations (already filtered by excludeIds at query level)
  const scoredCandidates: ReplacementCandidate[] = availableLocations
    .map((location) => {
      const scoreResult = scoreLocation(location, criteria);
      return {
        location,
        score: scoreResult.score,
        breakdown: scoreResult.breakdown,
        reasoning: scoreResult.reasoning,
      };
    })
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, maxCandidates);

  return {
    candidates: scoredCandidates,
    originalActivity: activity,
  };
}

/**
 * Convert a Location to an ItineraryActivity for replacement.
 */
export function locationToActivity(
  location: Location,
  originalActivity: Extract<ItineraryActivity, { kind: "place" }>,
): Extract<ItineraryActivity, { kind: "place" }> {
  const duration =
    location.recommendedVisit?.typicalMinutes ??
    getCategoryDefaultDuration(location.category ?? "landmark");

  // Preserve timeOfDay from original activity
  const timeOfDay = originalActivity.timeOfDay;

  // Build tags from location category and interests
  const tags: string[] = [];
  if (location.category) {
    tags.push(location.category);
  }

  return {
    kind: "place",
    id: `${location.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: location.name,
    timeOfDay,
    durationMin: duration,
    neighborhood: location.neighborhood ?? location.city,
    tags,
    locationId: location.id,
    notes: originalActivity.notes, // Preserve notes
  };
}
