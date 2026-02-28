import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type CommunityRating = {
  locationId: string;
  avgRating: number;
  count: number;
};

/**
 * Fetch aggregated community ratings for a batch of location IDs.
 * Returns a Map of locationId → { avgRating, count }.
 * Only includes locations with 3+ ratings (minimum for statistical relevance).
 */
export async function fetchCommunityRatings(
  locationIds: string[],
): Promise<Map<string, CommunityRating>> {
  const result = new Map<string, CommunityRating>();
  if (locationIds.length === 0) return result;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_community_ratings", {
      p_location_ids: locationIds,
    });

    if (error) {
      logger.warn("Failed to fetch community ratings, falling back to empty", {
        error: error.message,
      });
      return result;
    }

    if (data) {
      for (const row of data as Array<{
        location_id: string;
        avg_rating: number;
        rating_count: number;
      }>) {
        if (row.rating_count >= 3) {
          result.set(row.location_id, {
            locationId: row.location_id,
            avgRating: row.avg_rating,
            count: row.rating_count,
          });
        }
      }
    }
  } catch (err) {
    logger.warn("Community ratings fetch threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}
