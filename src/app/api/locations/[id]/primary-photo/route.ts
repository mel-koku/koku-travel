import { NextRequest, NextResponse } from "next/server";

import { isValidLocationId } from "@/lib/api/validation";
import { locationIdSchema } from "@/lib/api/schemas";
import { badRequest, notFound } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createClient } from "@/lib/supabase/server";

/**
 * Columns needed for primary photo endpoint
 * Uses pre-enriched primary_photo_url from database
 */
const LOCATION_PRIMARY_PHOTO_COLUMNS = `
  id,
  name,
  place_id,
  image,
  primary_photo_url,
  short_description
`.replace(/\s+/g, "");

type LocationPrimaryPhotoRow = {
  id: string;
  name: string;
  place_id: string | null;
  image: string;
  primary_photo_url: string | null;
  short_description: string | null;
};

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

  // Fetch location from database with pre-enriched primary_photo_url
  const supabase = await createClient();
  const { data: locationData, error: dbError } = await supabase
    .from("locations")
    .select(LOCATION_PRIMARY_PHOTO_COLUMNS)
    .eq("id", validatedId)
    .single();

  if (dbError || !locationData) {
    return notFound("Location not found");
  }

  const row = locationData as unknown as LocationPrimaryPhotoRow;

  // Use pre-enriched primary_photo_url from database (no Google API call)
  // Falls back to location.image if no primary_photo_url exists
  const photoUrl = row.primary_photo_url ?? row.image;

  return NextResponse.json(
    {
      placeId: row.place_id ?? row.id,
      fetchedAt: new Date().toISOString(),
      photo: photoUrl
        ? { name: "primary", proxyUrl: photoUrl, attributions: [] }
        : null,
      displayName: row.name,
      editorialSummary: row.short_description ?? null,
    },
    {
      status: 200,
      headers: {
        // 30-day cache since data is from DB (photos don't change frequently)
        "Cache-Control": "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800",
      },
    },
  );
}


