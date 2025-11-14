import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rateLimit";

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const draft = await draftMode();
  draft.disable();
  const referer = request.headers.get("Referer");
  const redirectUrl = referer ? new URL(referer) : new URL("/", request.url);
  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const draft = await draftMode();
  draft.disable();
  const redirectUrl = request.nextUrl.searchParams.get("redirectTo");
  return NextResponse.json({
    ok: true,
    redirect: redirectUrl ?? "/",
  });
}

