import { NextRequest, NextResponse } from "next/server";

import { fetchPhotoStream } from "@/lib/googlePlaces";
import { isValidPhotoName, parsePositiveInt } from "@/lib/api/validation";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";

const MAX_DIMENSION = 4000; // Reasonable maximum for image dimensions

export async function GET(request: NextRequest) {
  // Rate limiting: 200 requests per minute per IP (images are cached)
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 200, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const photoNameParam = searchParams.get("photoName");

  if (!photoNameParam) {
    return badRequest("Missing required query parameter 'photoName'.");
  }

  if (!isValidPhotoName(photoNameParam)) {
    return badRequest("Invalid photoName parameter format.");
  }

  const maxWidthPx = parsePositiveInt(searchParams.get("maxWidthPx"), MAX_DIMENSION);
  const maxHeightPx = parsePositiveInt(searchParams.get("maxHeightPx"), MAX_DIMENSION);

  try {
    const response = await fetchPhotoStream(photoNameParam, {
      maxWidthPx: maxWidthPx ?? undefined,
      maxHeightPx: maxHeightPx ?? undefined,
    });

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load place photo.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return serviceUnavailable("Google Places API is not configured.");
    }

    return internalError(message, { photoName: photoNameParam });
  }
}

