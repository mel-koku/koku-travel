import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { internalError, unauthorized, badRequest } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { previewSlugSchema, secretSchema } from "@/lib/api/schemas";
import { sanitizePath } from "@/lib/api/sanitization";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import {
  RATE_LIMIT_PREVIEW_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";

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
  // Create request context for tracing
  const context = createRequestContext(request);

  // Rate limiting: 20 requests per minute per IP (prevent brute force on secret)
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: RATE_LIMIT_PREVIEW_MAX_REQUESTS,
    windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  if (!PREVIEW_SECRET) {
    return addRequestContextHeaders(
      internalError("Preview secret is not configured on the server.", undefined, {
        requestId: context.requestId,
      }),
      context,
    );
  }

  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");
  const slugParam = searchParams.get("slug");

  // Validate secret parameter
  const secretValidation = secretSchema.safeParse(secretParam);
  if (!secretValidation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid secret parameter format.", undefined, {
        requestId: context.requestId,
      }),
      context,
    );
  }

  if (secretValidation.data !== PREVIEW_SECRET) {
    logger.warn("Invalid preview secret attempt", {
      requestId: context.requestId,
      ip: context.ip,
    });
    return addRequestContextHeaders(
      unauthorized("Invalid preview secret.", {
        requestId: context.requestId,
      }),
      context,
    );
  }

  // Validate slug parameter
  if (!slugParam) {
    return addRequestContextHeaders(
      badRequest("Missing slug parameter.", undefined, {
        requestId: context.requestId,
      }),
      context,
    );
  }

  const slugValidation = previewSlugSchema.safeParse(slugParam);
  if (!slugValidation.success) {
    return addRequestContextHeaders(
      badRequest("Invalid slug parameter format.", {
        errors: slugValidation.error.issues,
      }, {
        requestId: context.requestId,
      }),
      context,
    );
  }

  // Additional sanitization for path safety
  const sanitizedSlug = sanitizePath(slugValidation.data);
  if (!sanitizedSlug) {
    return addRequestContextHeaders(
      badRequest("Slug contains unsafe characters.", undefined, {
        requestId: context.requestId,
      }),
      context,
    );
  }

  logger.info("Preview mode enabled", {
    requestId: context.requestId,
    slug: sanitizedSlug,
  });

  const draft = await draftMode();
  draft.enable();
  
  const redirectUrl = resolveRedirectUrl(request, sanitizedSlug);
  const response = NextResponse.redirect(redirectUrl);
  return addRequestContextHeaders(response, context);
}

