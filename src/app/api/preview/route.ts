import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { internalError, unauthorized, badRequest } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { previewSlugSchema, secretSchema } from "@/lib/api/schemas";
import { sanitizePath } from "@/lib/api/sanitization";
import { env } from "@/lib/env";

const PREVIEW_SECRET = env.sanityPreviewSecret;

function resolveRedirectUrl(request: NextRequest, slug: string) {
  const target = slug.startsWith("/") ? slug : `/${slug}`;
  return new URL(target, request.url);
}

/**
 * GET /api/preview
 * Enables Sanity CMS draft mode and redirects to a preview page.
 * Requires a valid preview secret to prevent unauthorized access.
 *
 * @param request - Next.js request object
 * @param request.url.secret - Preview secret (must match SANITY_PREVIEW_SECRET)
 * @param request.url.slug - Slug of the guide to preview (must be a valid path)
 * @returns Redirects to the preview page, or error response
 * @throws Returns 400 if secret or slug format is invalid
 * @throws Returns 401 if preview secret is incorrect
 * @throws Returns 429 if rate limit exceeded (20 requests/minute)
 * @throws Returns 500 if preview secret is not configured
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP (prevent brute force on secret)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!PREVIEW_SECRET) {
    return internalError("Preview secret is not configured on the server.");
  }

  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");
  const slugParam = searchParams.get("slug");

  // Validate secret parameter
  const secretValidation = secretSchema.safeParse(secretParam);
  if (!secretValidation.success) {
    return badRequest("Invalid secret parameter format.");
  }

  if (secretValidation.data !== PREVIEW_SECRET) {
    return unauthorized("Invalid preview secret.");
  }

  // Validate slug parameter
  if (!slugParam) {
    return badRequest("Missing slug parameter.");
  }

  const slugValidation = previewSlugSchema.safeParse(slugParam);
  if (!slugValidation.success) {
    return badRequest("Invalid slug parameter format.", {
      errors: slugValidation.error.issues,
    });
  }

  // Additional sanitization for path safety
  const sanitizedSlug = sanitizePath(slugValidation.data);
  if (!sanitizedSlug) {
    return badRequest("Slug contains unsafe characters.");
  }

  const draft = await draftMode();
  draft.enable();
  return NextResponse.redirect(resolveRedirectUrl(request, sanitizedSlug));
}

