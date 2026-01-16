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
 * GET /api/locations/[id]/primary-photo
 * Fetches the primary photo reference for a location from Google Places API.
 *
 * @param request - Next.js request object
 * @param context - Route context containing the location ID parameter
 * @param context.params.id - Location ID (must be a valid identifier)
 * @returns Photo reference object with placeId and photo data, or error response
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
    placeId: locationData.place_id ?? undefined,
    coordinates: locationData.coordinates ?? undefined,
  };

  try {
    const details = await fetchLocationDetails(location);
    const [photo] = details.photos ?? [];

    return NextResponse.json(
      {
        placeId: details.placeId,
        fetchedAt: details.fetchedAt,
        photo: photo ?? null,
        displayName: details.displayName ?? null,
        editorialSummary: details.editorialSummary ?? null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load location photo.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return serviceUnavailable("Google Places API is not configured.");
    }

    return internalError(message, { locationId: validatedId });
  }
}


