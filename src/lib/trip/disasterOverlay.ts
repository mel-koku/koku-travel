import type { StoredTrip } from "@/services/trip/types";
import { getWeatherRegion } from "@/data/regions";

/**
 * Check if a trip overlaps with typhoon season based on dates and region.
 *
 * Logic:
 * 1. If trip start/end dates overlap Aug 15 – Oct 15 (any region): return true
 * 2. Else if primary destination city is in tropical_south region AND trip overlaps Jun 1 – Sep 30: return true
 * 3. Else: return false
 */
export function tripOverlapsTyphoonSeason(trip: StoredTrip): boolean {
  const dates = trip.builderData?.dates;
  const cities = trip.builderData?.cities;

  // Invalid dates or no cities: no typhoon risk
  if (!dates?.start || !dates?.end) return false;
  if (!cities || cities.length === 0) return false;

  // Parse dates (ISO format: yyyy-mm-dd)
  const [sy = 0, sm = 1, sd = 1] = dates.start.split("-").map(Number);
  const [ey = 0, em = 1, ed = 1] = dates.end.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return false;

  const tripStart = new Date(sy, sm - 1, sd);
  const tripEnd = new Date(ey, em - 1, ed);

  // Get the primary destination region
  const primaryCityId = cities[0];
  const region = getWeatherRegion(primaryCityId);

  // Peak typhoon season (Aug 15 – Oct 15, any region)
  const peakSeasonStart = new Date(sy, 7, 15); // Aug 15
  const peakSeasonEnd = new Date(sy, 9, 15); // Oct 15
  if (tripStart <= peakSeasonEnd && tripEnd >= peakSeasonStart) {
    return true;
  }

  // Tropical south (Jun 1 – Sep 30)
  if (region === "tropical_south") {
    const tropicalStart = new Date(sy, 5, 1); // Jun 1
    const tropicalEnd = new Date(sy, 8, 30); // Sep 30
    if (tripStart <= tropicalEnd && tripEnd >= tropicalStart) {
      return true;
    }
  }

  return false;
}

/**
 * Determine if the disaster banner should be shown based on gating rules.
 *
 * Show banner if:
 * 1. tripOverlapsTyphoonSeason returns true
 * 2. Trip status is "upcoming"
 * 3. Trip start date is between 4 weeks away and 12 weeks away
 *    (or less than 4 weeks away, to educate on safety even if too late to rebook)
 */
export function shouldShowDisasterBanner(trip: StoredTrip): boolean {
  // Must overlap typhoon season
  if (!tripOverlapsTyphoonSeason(trip)) return false;

  // Must be upcoming (not active, completed, or planning)
  const dates = trip.builderData?.dates;
  if (!dates?.start) return false;

  const [sy = 0, sm = 1, sd = 1] = dates.start.split("-").map(Number);
  if (!sy || !sm || !sd) return false;

  const tripStart = new Date(sy, sm - 1, sd);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilStart = Math.ceil((tripStart.getTime() - today.getTime()) / msPerDay);

  // If trip is in the past or happening now, don't show
  if (daysUntilStart <= 0) return false;

  // If more than 12 weeks away (84 days), don't show (too early to book refundable)
  // Exception: if less than 4 weeks away, always show for safety education
  const tooEarlyThreshold = 84;
  if (daysUntilStart > tooEarlyThreshold) return false;

  return true;
}
