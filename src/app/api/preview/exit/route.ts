import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { redirectUrlSchema } from "@/lib/api/schemas";
import { sanitizeRedirectUrl } from "@/lib/api/sanitization";
import { badRequest } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
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

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
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

