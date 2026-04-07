import type { Location } from "@/types/location";
import type { LocationScoringCriteria, ScoringResult } from "@/lib/scoring/types";
import { calculateDistance } from "@/lib/utils/geoUtils";
import { getLocationDurationMinutes } from "@/lib/scoring/factors/helpers";

/**
 * Score logistical fit (distance, duration, time slot).
 * Range: -100 to 20 points
 *
 * IMPORTANT: Locations >50km away receive a hard penalty of -100 to effectively
 * exclude them from selection. This prevents cross-region recommendations where
 * a location's city field may be incorrect (e.g., "Osaka" location actually in Okinawa).
 */
export function scoreLogisticalFit(
  location: Location,
  criteria: LocationScoringCriteria,
): ScoringResult {
  let score = 10; // Base score
  const reasons: string[] = [];

  // Distance scoring with hard cutoffs and stronger penalties
  if (criteria.currentLocation && location.coordinates) {
    const distanceKm = calculateDistance(criteria.currentLocation, location.coordinates);

    // Contextual distance threshold: the 50-75km band opens up based on
    // trip style and vibes. A Japan travel guide wouldn't skip Yamadera
    // (60km from Sendai) for a history lover, or Ginzan Onsen (70km) for
    // a relaxed traveler. But a fast-paced Tokyo foodie shouldn't get
    // locations 75km away between lunch and dinner.
    //
    // Extended range (75km) activates when:
    //   1. Relaxed pace (any vibe, any category) — relaxed travelers accept longer commutes
    //   2. Nature/adventure vibes + nature-ish categories (any pace)
    //   3. Cultural/history vibes + cultural categories (any pace)
    //   4. Craft vibe + craft category (any pace)
    const NATURE_CATEGORIES = new Set(["nature", "park", "beach", "viewpoint", "onsen"]);
    const CULTURAL_CATEGORIES = new Set(["temple", "shrine", "castle", "historic_site", "culture", "landmark"]);
    const category = location.category ?? "";

    const useExtendedRange =
      // Relaxed pace always gets extended range
      criteria.travelStyle === "relaxed" ||
      // Nature vibes + nature categories
      ((criteria.hasNatureAdventureVibe || criteria.hasLocalSecretsVibe) && NATURE_CATEGORIES.has(category)) ||
      // Cultural vibes + cultural categories
      (criteria.hasHeritageVibe && CULTURAL_CATEGORIES.has(category)) ||
      // Local secrets vibe extends range for all categories
      // (local_secrets users actively seek off-beaten-path locations regardless of type)
      criteria.hasLocalSecretsVibe;

    const hardCutoffKm = useExtendedRange ? 75 : 50;

    // CRITICAL: Hard cutoff for locations way too far away
    // This catches data corruption where locations have wrong city assignments
    if (distanceKm > hardCutoffKm) {
      // Return immediately with hard penalty - this location should not be selected
      return {
        score: -100,
        reasoning: `Location is ${distanceKm.toFixed(1)}km away - outside acceptable range (max ${hardCutoffKm}km).${useExtendedRange ? "" : " May indicate incorrect city assignment."}`,
      };
    }

    // Graduated distance scoring with stronger penalties for far locations
    if (distanceKm < 1) {
      score += 8;
      reasons.push("Very close (<1km)");
    } else if (distanceKm < 3) {
      score += 6;
      reasons.push("Nearby (1-3km)");
    } else if (distanceKm < 5) {
      score += 4;
      reasons.push("Moderate distance (3-5km)");
    } else if (distanceKm < 10) {
      score += 1;
      reasons.push("Far (5-10km)");
    } else if (distanceKm < 20) {
      score -= 5;
      reasons.push(`Far away (${distanceKm.toFixed(1)}km) - consider closer options`);
    } else if (distanceKm < 50) {
      score -= 15;
      reasons.push(`Very far (${distanceKm.toFixed(1)}km) - significant travel required`);
    } else if (distanceKm < 75) {
      // Extended range band: steep penalty so closer alternatives still win,
      // but the location can survive if interest/rating/tag scores are strong
      score -= 25;
      reasons.push(`Extended range (${distanceKm.toFixed(1)}km) - nature/adventure day trip`);
    }
  } else {
    reasons.push("No distance data available");
  }

  // Duration fit (0-7 points)
  const locationDuration = getLocationDurationMinutes(location);
  const availableMinutes = criteria.availableMinutes;

  if (locationDuration <= availableMinutes * 0.3) {
    score += 2; // Too short, but acceptable
    reasons.push("Short duration, fits easily");
  } else if (locationDuration <= availableMinutes * 0.7) {
    score += 7; // Optimal duration
    reasons.push("Duration fits well in time slot");
  } else if (locationDuration <= availableMinutes * 1.1) {
    score += 4; // Slightly over, but manageable
    reasons.push("Duration slightly exceeds available time");
  } else {
    score -= 3; // Too long
    reasons.push("Duration exceeds available time significantly");
  }

  // Travel style adjustment (0-5 points)
  if (criteria.travelStyle === "fast" && locationDuration > 180) {
    score -= 2; // Penalize long activities for fast pace
    reasons.push("Too long for fast-paced travel");
  } else if (criteria.travelStyle === "relaxed" && locationDuration < 60) {
    score -= 1; // Prefer longer activities for relaxed pace
    reasons.push("Short duration for relaxed pace");
  }

  // Clamp score to -100 to 20 range (negative values for hard penalties)
  score = Math.max(-100, Math.min(20, score));

  return {
    score,
    reasoning: reasons.join("; "),
  };
}
