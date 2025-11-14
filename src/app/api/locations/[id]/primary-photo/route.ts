import { NextRequest, NextResponse } from "next/server";

import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { fetchLocationDetails } from "@/lib/googlePlaces";
import type { Location } from "@/types/location";
import { isValidLocationId } from "@/lib/api/validation";
import { badRequest, notFound, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";

const locationsById = new Map<string, Location>(MOCK_LOCATIONS.map((location) => [location.id, location]));

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;

  if (!isValidLocationId(id)) {
    return badRequest("Invalid location ID format");
  }

  const location = locationsById.get(id);
  if (!location) {
    return notFound("Location not found");
  }

  try {
    const details = await fetchLocationDetails(location);
    const [photo] = details.photos ?? [];

    return NextResponse.json(
      {
        placeId: details.placeId,
        fetchedAt: details.fetchedAt,
        photo: photo ?? null,
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

    return internalError(message, { locationId: id });
  }
}


