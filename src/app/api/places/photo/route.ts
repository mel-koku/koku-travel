import { NextRequest } from "next/server";

import { fetchPhotoStream } from "@/lib/googlePlaces";
import { isValidPhotoName, parsePositiveInt } from "@/lib/api/validation";
import { photoNameSchema } from "@/lib/api/schemas";
import { badRequest, internalError, serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createRequestContext, addRequestContextHeaders } from "@/lib/api/middleware";

const MAX_DIMENSION = 4000; // Reasonable maximum for image dimensions

/**
 * GET /api/places/photo
 * Fetches a photo from Google Places API by photo name.
 *
 * @param request - Next.js request object
 * @param request.url - Must contain query parameter 'photoName' (format: places/{place_id}/photos/{photo_reference})
 * @param request.url.maxWidthPx - Optional maximum width in pixels (1-4000)
 * @param request.url.maxHeightPx - Optional maximum height in pixels (1-4000)
 * @returns Photo stream with appropriate cache headers, or error response
 * @throws Returns 400 if photoName is missing or invalid
 * @throws Returns 429 if rate limit exceeded (200 requests/minute)
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  // Rate limiting: 200 requests per minute per IP (images are cached)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 200, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const { searchParams } = new URL(request.url);
  // Accept both 'photoName' (new) and 'reference' (legacy) parameters
  const photoNameParam = searchParams.get("photoName") ?? searchParams.get("reference");

  if (!photoNameParam) {
    return addRequestContextHeaders(badRequest("Missing required query parameter 'photoName'."), context);
  }

  // Validate using both existing function and Zod schema for defense in depth
  const photoNameValidation = photoNameSchema.safeParse(photoNameParam);
  if (!photoNameValidation.success || !isValidPhotoName(photoNameParam)) {
    return addRequestContextHeaders(
      badRequest("Invalid photoName parameter format.", {
        errors: photoNameValidation.success ? undefined : photoNameValidation.error.issues,
      }),
      context,
    );
  }

  const validatedPhotoName = photoNameValidation.data;

  // Validate dimension parameters - accept both new (maxWidthPx) and legacy (maxwidth) formats
  const maxWidthParam = searchParams.get("maxWidthPx") ?? searchParams.get("maxwidth");
  const maxHeightParam = searchParams.get("maxHeightPx") ?? searchParams.get("maxheight");

  // Use existing validation function which is already robust
  // Default to 800px width if no dimensions provided (required by Google Places API)
  const maxWidthPx = maxWidthParam ? parsePositiveInt(maxWidthParam, MAX_DIMENSION) ?? 800 : 800;
  const maxHeightPx = maxHeightParam ? parsePositiveInt(maxHeightParam, MAX_DIMENSION) ?? undefined : undefined;

  try {
    const response = await fetchPhotoStream(validatedPhotoName, {
      maxWidthPx,
      maxHeightPx,
    });

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load place photo.";
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Missing Google Places API key")) {
      return addRequestContextHeaders(serviceUnavailable("Google Places API is not configured."), context);
    }

    return addRequestContextHeaders(internalError(message, { photoName: validatedPhotoName }), context);
  }
}

