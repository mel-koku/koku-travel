import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";

/**
 * GET /api/locations
 * Fetches all locations from Supabase.
 *
 * @param request - Next.js request object
 * @returns Array of Location objects, or error response
 * @throws Returns 500 for database errors
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      logger.error("Failed to fetch locations from Supabase", { error });
      return internalError("Failed to fetch locations from database", { error: error.message });
    }

    // Transform Supabase data to Location type
    const locations: Location[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      region: row.region,
      city: row.city,
      category: row.category,
      image: row.image,
      minBudget: row.min_budget ?? undefined,
      estimatedDuration: row.estimated_duration ?? undefined,
      operatingHours: row.operating_hours ?? undefined,
      recommendedVisit: row.recommended_visit ?? undefined,
      preferredTransitModes: row.preferred_transit_modes ?? undefined,
      coordinates: row.coordinates ?? undefined,
      timezone: row.timezone ?? undefined,
      shortDescription: row.short_description ?? undefined,
      rating: row.rating ?? undefined,
      reviewCount: row.review_count ?? undefined,
      placeId: row.place_id ?? undefined,
    }));

    return NextResponse.json(
      { locations },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    logger.error("Unexpected error fetching locations", { error });
    const message = error instanceof Error ? error.message : "Failed to load locations.";
    return internalError(message);
  }
}

