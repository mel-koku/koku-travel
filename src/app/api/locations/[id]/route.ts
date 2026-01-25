import { NextRequest, NextResponse } from "next/server";

import { fetchLocationDetails } from "@/lib/googlePlaces";
import type { Location } from "@/types/location";
import { isValidLocationId } from "@/lib/api/validation";
import { locationIdSchema } from "@/lib/api/schemas";
import { badRequest, notFound, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_DETAIL_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import { getBestSummary } from "@/lib/utils/editorialSummary";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/locations/[id]
 * Fetches location details including Google Places data for a given location ID.
 *
 * @param request - Next.js request object
 * @param context - Route context containing the location ID parameter
 * @param context.params.id - Location ID (must be a valid identifier)
 * @returns Location object with enriched details from Google Places API, or error response
 * @throws Returns 400 if location ID format is invalid
 * @throws Returns 404 if location is not found
 * @throws Returns 429 if rate limit exceeded (100 requests/minute)
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;

  // Validate using both existing function and Zod schema for defense in depth
  const idValidation = locationIdSchema.safeParse(id);
  if (!idValidation.success || !isValidLocationId(id)) {
    return badRequest("Invalid location ID format", {
      errors: idValidation.success ? undefined : idValidation.error.issues,
    });
  }

  const validatedId = idValidation.data;

  // Fetch location from database
  const supabase = await createClient();
  const { data: locationData, error: dbError } = await supabase
    .from("locations")
    .select(LOCATION_DETAIL_COLUMNS)
    .eq("id", validatedId)
    .single();

  if (dbError || !locationData) {
    return notFound("Location not found");
  }

  // Transform database row to Location type
  const row = locationData as unknown as LocationDbRow;
  const location: Location = {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    category: row.category,
    image: row.image,
    description: row.description ?? undefined,
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
  };

  // Check if location has a valid place_id
  // Locations without place_id cannot fetch Google Places details
  if (!location.placeId || location.placeId.trim() === "") {
    return notFound(
      `Location "${location.name}" does not have a valid Google Place ID and cannot load details.`,
    );
  }

  try {
    const details = await fetchLocationDetails(location);

    // Apply editorial summary priority chain: Google > Claude > Original
    // See @/lib/utils/editorialSummary for documentation on priority order
    details.editorialSummary = getBestSummary(location, details.editorialSummary);

    return NextResponse.json(
      {
        location,
        details,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load location details.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return serviceUnavailable("Google Places API is not configured.");
    }

    return internalError(message, { locationId: validatedId });
  }
}

