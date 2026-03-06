import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound } from "@/lib/api/errors";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";

const tripIdSchema = z.string().uuid();

type RatingRow = {
  activity_id: string;
  location_id: string | null;
  rating: number;
  comment: string | null;
};

/**
 * GET /api/trips/[id]/summary
 *
 * Auth required. Returns aggregated trip stats and ratings for a completed trip.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await props.params;
  return withApiHandler(
    async (_req, { user }) => {
      const parsed = tripIdSchema.safeParse(tripId);
      if (!parsed.success) {
        return badRequest("Invalid trip ID");
      }

      const supabase = getServiceRoleClient();

      // Fetch trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("itinerary, builder_data, name")
        .eq("id", tripId)
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (tripError || !trip) {
        return notFound("Trip not found");
      }

      const itinerary = trip.itinerary as unknown as Itinerary;
      if (!itinerary?.days?.length) {
        return notFound("Trip has no itinerary");
      }

      // Fetch ratings
      const { data: ratings } = await supabase
        .from("activity_ratings")
        .select("activity_id, location_id, rating, comment")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id);

      const ratingsList: RatingRow[] = (ratings ?? []) as RatingRow[];
      const ratingsMap = new Map<string, RatingRow>();
      for (const r of ratingsList) {
        ratingsMap.set(r.activity_id, r);
      }

      // Aggregate stats
      const cities = [...new Set(itinerary.days.map((d: ItineraryDay) => d.cityId).filter(Boolean))];
      let totalActivities = 0;
      let ratedCount = 0;
      let ratingSum = 0;

      const perCityMap = new Map<string, { activityCount: number; ratingSum: number; ratedCount: number }>();

      for (const day of itinerary.days) {
        const cityId = day.cityId ?? "unknown";
        if (!perCityMap.has(cityId)) {
          perCityMap.set(cityId, { activityCount: 0, ratingSum: 0, ratedCount: 0 });
        }
        const cityStats = perCityMap.get(cityId)!;

        for (const activity of day.activities) {
          if (activity.kind !== "place") continue;
          totalActivities++;
          cityStats.activityCount++;

          const r = ratingsMap.get(activity.id);
          if (r) {
            ratedCount++;
            ratingSum += r.rating;
            cityStats.ratedCount++;
            cityStats.ratingSum += r.rating;
          }
        }
      }

      // Top rated (top 3)
      const topRated = ratingsList
        .filter((r) => r.rating >= 4)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3)
        .map((r) => {
          // Find title from itinerary
          let title = "Unknown";
          for (const day of itinerary.days) {
            const act = day.activities.find((a: ItineraryActivity) => a.id === r.activity_id);
            if (act && act.kind === "place") {
              title = (act as Extract<ItineraryActivity, { kind: "place" }>).title;
              break;
            }
          }
          return {
            activityId: r.activity_id,
            locationId: r.location_id,
            title,
            rating: r.rating,
          };
        });

      const perCity = [...perCityMap.entries()].map(([cityId, stats]) => ({
        cityId,
        activityCount: stats.activityCount,
        avgRating: stats.ratedCount > 0 ? Math.round((stats.ratingSum / stats.ratedCount) * 10) / 10 : null,
      }));

      return NextResponse.json({
        tripName: trip.name,
        totalDays: itinerary.days.length,
        cities,
        totalActivities,
        avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
        ratedCount,
        topRated,
        perCity,
      });
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}
