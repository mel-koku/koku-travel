import { NextRequest, NextResponse } from "next/server";

import { fetchLocationDetails } from "@/lib/googlePlaces";
import type { Location } from "@/types/location";
import { isValidLocationId } from "@/lib/api/validation";
import { locationIdSchema } from "@/lib/api/schemas";
import { badRequest, notFound, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createClient } from "@/lib/supabase/server";

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
    .select("*")
    .eq("id", validatedId)
    .single();

  if (dbError || !locationData) {
    return notFound("Location not found");
  }

  // Transform database row to Location type
  const location: Location = {
    id: locationData.id,
    name: locationData.name,
    region: locationData.region,
    city: locationData.city,
    category: locationData.category,
    image: locationData.image,
    minBudget: locationData.min_budget ?? undefined,
    estimatedDuration: locationData.estimated_duration ?? undefined,
    operatingHours: locationData.operating_hours ?? undefined,
    recommendedVisit: locationData.recommended_visit ?? undefined,
    preferredTransitModes: locationData.preferred_transit_modes ?? undefined,
    coordinates: locationData.coordinates ?? undefined,
    timezone: locationData.timezone ?? undefined,
    shortDescription: locationData.short_description ?? undefined,
    rating: locationData.rating ?? undefined,
    reviewCount: locationData.review_count ?? undefined,
    placeId: locationData.place_id ?? undefined,
  };

  try {
    const details = await fetchLocationDetails(location);

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

