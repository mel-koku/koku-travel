import { NextRequest, NextResponse } from "next/server";

import { fetchPhotoStream } from "@/lib/googlePlaces";
import { isValidPhotoName, parsePositiveInt } from "@/lib/api/validation";
import { photoNameSchema } from "@/lib/api/schemas";
import { badRequest, serviceUnavailable } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { featureFlags } from "@/lib/env/featureFlags";

const MAX_DIMENSION = 4000;

/**
 * GET /api/places/photo
 * Fetches a photo from Google Places API by photo name.
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const photoNameParam = searchParams.get("photoName") ?? searchParams.get("reference");

    if (!photoNameParam) {
      return badRequest("Missing required query parameter 'photoName'.");
    }

    if (!featureFlags.enableGooglePlaces) {
      return serviceUnavailable("Google Places API calls are disabled.");
    }

    const photoNameValidation = photoNameSchema.safeParse(photoNameParam);
    if (!photoNameValidation.success || !isValidPhotoName(photoNameParam)) {
      return badRequest("Invalid photoName parameter format.", {
        errors: photoNameValidation.success ? undefined : photoNameValidation.error.issues,
      });
    }

    const validatedPhotoName = photoNameValidation.data;

    const maxWidthParam = searchParams.get("maxWidthPx") ?? searchParams.get("maxwidth");
    const maxHeightParam = searchParams.get("maxHeightPx") ?? searchParams.get("maxheight");

    const maxWidthPx = maxWidthParam ? parsePositiveInt(maxWidthParam, MAX_DIMENSION) ?? 800 : 800;
    const maxHeightPx = maxHeightParam ? parsePositiveInt(maxHeightParam, MAX_DIMENSION) ?? undefined : undefined;

    try {
      const response = await fetchPhotoStream(validatedPhotoName, {
        maxWidthPx,
        maxHeightPx,
      });

      const headers = new Headers(response.headers);
      // Google's photo endpoint sends `Expires: Fri, 01 Jan 1990` + `Vary: Origin`
      // to discourage caching. Strip them so Vercel's CDN honors our s-maxage
      // and serves repeat hits from the edge instead of re-billing Google.
      headers.delete("expires");
      headers.delete("etag");
      headers.delete("vary");
      headers.set("Cache-Control", "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800");

      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";

      if (errorMessage.includes("Missing Google Places API key")) {
        return serviceUnavailable("Google Places API is not configured.");
      }

      throw error;
    }
  },
  { rateLimit: { maxRequests: 200, windowMs: 60_000 } },
);
