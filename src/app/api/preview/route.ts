import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { internalError, unauthorized, badRequest } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { previewSlugSchema, secretSchema } from "@/lib/api/schemas";
import { sanitizePath } from "@/lib/api/sanitization";

const PREVIEW_SECRET = process.env.SANITY_PREVIEW_SECRET;

function resolveRedirectUrl(request: NextRequest, slug: string) {
  const target = slug.startsWith("/") ? slug : `/${slug}`;
  return new URL(target, request.url);
}

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

