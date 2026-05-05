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

    // Canonicalize to {640, 1200, 1920} via 308 so a scraper spraying unique
    // widths or height params can't fragment the CDN cache and bill Google
    // once per variant. imageLoader already buckets first-party callers.
    const requestedWidth = maxWidthParam ? parsePositiveInt(maxWidthParam, MAX_DIMENSION) ?? 1200 : 1200;
    const bucketedWidth = requestedWidth <= 640 ? 640 : requestedWidth <= 1200 ? 1200 : 1920;

    const isCanonical =
      requestedWidth === bucketedWidth &&
      !searchParams.has("maxwidth") &&
      !searchParams.has("maxHeightPx") &&
      !searchParams.has("maxheight");

    if (!isCanonical) {
      const canonical = new URL(request.url);
      canonical.searchParams.delete("maxwidth");
      canonical.searchParams.delete("maxHeightPx");
      canonical.searchParams.delete("maxheight");
      canonical.searchParams.set("maxWidthPx", String(bucketedWidth));
      const redirect = NextResponse.redirect(canonical, 308);
      redirect.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return redirect;
    }

    const maxWidthPx = bucketedWidth;

    try {
      const response = await fetchPhotoStream(validatedPhotoName, { maxWidthPx });

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
