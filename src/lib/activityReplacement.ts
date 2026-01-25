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
  _allActivities: ItineraryActivity[],
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

  // Get the city to filter by (from activity or original location)
  const city = activity.neighborhood ?? originalLocation?.city ?? "";

  // Fetch available locations from the database, filtering by city
  // This now queries all 2,586 real locations instead of ~500 mock ones
  const availableLocations = await fetchLocationsByCity(city, {
    limit: 100, // Get more candidates for better scoring
    excludeIds: originalLocation ? [originalLocation.id] : [],
    requirePlaceId: true,
  });

  // Score all available locations
  const scoredCandidates: ReplacementCandidate[] = availableLocations
    .filter((location) => {
      // Exclude original location (should already be excluded by excludeIds)
      if (originalLocation && location.id === originalLocation.id) {
        return false;
      }

      // Exclude already-used locations (but allow duplicates if user wants variety)
      // For now, we'll allow duplicates but they'll score lower due to diversity penalty

      // Filter by city if activity has neighborhood/city info
      if (activity.neighborhood) {
        const activityCity = activity.neighborhood.toLowerCase();
        const locationCity = location.city.toLowerCase();
        // Allow same city or nearby cities
        if (
          activityCity !== locationCity &&
          !locationCity.includes(activityCity) &&
          !activityCity.includes(locationCity)
        ) {
          // Still allow, but will score lower due to distance
        }
      }

      return true;
    })
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
