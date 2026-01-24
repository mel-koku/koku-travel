/**
 * Server-side featured locations fetcher
 *
 * Fetches top 12 destinations by popularity score directly from Supabase,
 * enabling instant carousel display without waiting for client-side hydration.
 */

import { unstable_cache } from "next/cache";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Location } from "@/types/location";
import {
  LOCATION_LISTING_COLUMNS,
  type LocationListingDbRow,
} from "@/lib/supabase/projections";

/**
 * Calculate popularity score using Bayesian weighted average
 * Balances rating quality with review quantity to produce fair rankings
 * A 4.8 location with 500 reviews ranks higher than a 5.0 with 3 reviews
 */
function calculatePopularityScore(rating: number, reviewCount: number): number {
  if (rating === 0 || reviewCount === 0) return 0;

  const m = 50;   // minimum reviews threshold (smoothing factor)
  const C = 4.2;  // global average rating

  // Bayesian weighted average + log boost for volume
  const score = (reviewCount / (reviewCount + m)) * rating + (m / (reviewCount + m)) * C;
  const reviewBoost = Math.log10(reviewCount + 1) / 10;

  return score + reviewBoost;
}

// Deterministic fallback generation (matches client-side logic exactly)
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateFallbackRating(locationId: string): number {
  const hash = hashString(locationId);
  return 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
}

function generateFallbackReviewCount(locationId: string): number {
  const hash = hashString(locationId + "-reviews");
  return 50 + (hash % 450); // 50-500 range
}

/**
 * Transform database row to Location type with rating/reviewCount guaranteed
 */
function transformToFeaturedLocation(row: LocationListingDbRow): Location & { ratingValue: number; reviewCountValue: number } {
  const ratingValue = (typeof row.rating === "number" && Number.isFinite(row.rating))
    ? row.rating
    : generateFallbackRating(row.id);

  const reviewCountValue = (typeof row.review_count === "number" && row.review_count > 0)
    ? row.review_count
    : generateFallbackReviewCount(row.id);

  return {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    prefecture: row.prefecture ?? undefined,
    category: row.category,
    image: row.image,
    shortDescription: row.short_description ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    minBudget: row.min_budget ?? undefined,
    placeId: row.place_id ?? undefined,
    primaryPhotoUrl: row.primary_photo_url ?? undefined,
    priceLevel: row.price_level as Location["priceLevel"],
    accessibilityOptions: row.accessibility_options ?? undefined,
    dietaryOptions: row.dietary_options ?? undefined,
    // Include computed values for sorting (will be stripped before return)
    ratingValue,
    reviewCountValue,
  };
}

/**
 * Fetch featured locations directly from database
 * Returns top 12 locations sorted by Bayesian popularity score
 */
async function fetchFeaturedLocationsFromDb(): Promise<Location[]> {
  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    // Service role key not configured - fall back to client-side fetching
    return [];
  }

  // Fetch locations with good data quality (have photos)
  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_LISTING_COLUMNS)
    .not("primary_photo_url", "is", null)
    .limit(500); // Fetch enough to get good variety after scoring

  if (error || !data) {
    return [];
  }

  // Transform and score all locations
  const scoredLocations = (data as unknown as LocationListingDbRow[])
    .map(transformToFeaturedLocation)
    .map((location) => ({
      location,
      score: calculatePopularityScore(location.ratingValue, location.reviewCountValue),
    }));

  // Sort by popularity score and take top 12
  scoredLocations.sort((a, b) => b.score - a.score);

  // Return clean Location objects (strip computed fields)
  return scoredLocations.slice(0, 12).map(({ location }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ratingValue, reviewCountValue, ...cleanLocation } = location;
    return cleanLocation;
  });
}

/**
 * Get featured locations with Next.js cache
 * Cached for 1 hour to balance freshness with performance
 */
export const getFeaturedLocations = unstable_cache(
  fetchFeaturedLocationsFromDb,
  ["featured-locations"],
  {
    revalidate: 3600, // 1 hour
    tags: ["featured-locations"],
  }
);
