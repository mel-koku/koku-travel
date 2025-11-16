import { NextRequest } from "next/server";
import { fetchPlaceCoordinates } from "@/lib/googlePlaces";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import type { Location } from "@/types/location";

/**
 * GET /api/places/details?placeId=...&name=...
 * Fetch place details by Google Place ID and return as Location object.
 * 
 * @param request - Next.js request object
 * @param request.url - Must contain query parameter 'placeId', optional 'name'
 * @returns JSON object with Location details
 * @throws Returns 400 if placeId is missing or invalid
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const name = searchParams.get("name");

  if (!placeId || placeId.trim().length === 0) {
    return badRequest("Missing required query parameter 'placeId'.");
  }

  try {
    // Fetch place coordinates and basic info
    const place = await fetchPlaceCoordinates(placeId.trim());

    if (!place) {
      return badRequest(`Place not found for placeId: ${placeId}`);
    }

    // Create Location object from place data
    const location: Location = {
      id: placeId,
      name: name || place.displayName,
      region: place.formattedAddress?.split(",").pop()?.trim() || "",
      city: place.formattedAddress?.split(",")[0]?.trim() || "",
      category: "point_of_interest",
      image: "",
      coordinates: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      placeId: place.placeId,
    };

    return Response.json({ location }, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch place details.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return serviceUnavailable("Google Places API is not configured.");
    }

    return internalError(message);
  }
}

