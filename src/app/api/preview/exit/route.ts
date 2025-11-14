import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { redirectUrlSchema } from "@/lib/api/schemas";
import { sanitizeRedirectUrl } from "@/lib/api/sanitization";
import { badRequest } from "@/lib/api/errors";

/**
 * GET /api/preview/exit
 * Disables Sanity CMS draft mode and redirects to a safe URL.
 * Validates referer header to prevent open redirect attacks.
 *
 * @param request - Next.js request object
 * @param request.headers.referer - Optional referer URL (must be same origin)
 * @returns Redirects to referer URL (if safe) or home page, or error response
 * @throws Returns 429 if rate limit exceeded (30 requests/minute)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const draft = await draftMode();
  draft.disable();
  
  // Validate referer header to prevent open redirect
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const requestUrl = new URL(request.url);
      // Only allow redirect to same origin
      if (
        refererUrl.protocol === requestUrl.protocol &&
        refererUrl.hostname === requestUrl.hostname &&
        refererUrl.port === requestUrl.port
      ) {
        const sanitized = sanitizeRedirectUrl(refererUrl.pathname, requestUrl.origin);
        if (sanitized) {
          return NextResponse.redirect(new URL(sanitized, request.url));
        }
      }
    } catch {
      // Invalid referer URL, fall through to default
    }
  }
  
  return NextResponse.redirect(new URL("/", request.url));
}

/**
 * POST /api/preview/exit
 * Disables Sanity CMS draft mode and returns redirect information.
 * Validates redirect URL to prevent open redirect attacks.
 *
 * @param request - Next.js request object
 * @param request.url - Request URL (max 1KB)
 * @param request.url.redirectTo - Optional redirect URL query parameter (must be safe)
 * @returns JSON response with redirect URL, or error response
 * @throws Returns 400 if redirect URL is invalid or URL is too long
 * @throws Returns 429 if rate limit exceeded (30 requests/minute)
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Request size limit: 1KB for query parameters (this endpoint only uses query params, not body)
  const urlLength = request.url.length;
  const MAX_URL_LENGTH = 1024; // 1KB
  if (urlLength > MAX_URL_LENGTH) {
    return badRequest(`Request URL too long (max ${MAX_URL_LENGTH} bytes).`);
  }

  const draft = await draftMode();
  draft.disable();
  
  const redirectToParam = request.nextUrl.searchParams.get("redirectTo");
  
  if (redirectToParam) {
    // Validate redirect URL to prevent open redirect attacks
    const redirectValidation = redirectUrlSchema.safeParse(redirectToParam);
    if (!redirectValidation.success) {
      return badRequest("Invalid redirect URL format.", {
        errors: redirectValidation.error.issues,
      });
    }

    // Additional sanitization
    const sanitized = sanitizeRedirectUrl(redirectValidation.data, new URL(request.url).origin);
    if (!sanitized) {
      return badRequest("Redirect URL contains unsafe characters.");
    }

    return NextResponse.json({
      ok: true,
      redirect: sanitized,
    });
  }

  return NextResponse.json({
    ok: true,
    redirect: "/",
  });
}

