import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/callback
 * OAuth callback handler for Supabase authentication.
 * Exchanges authorization code for session and redirects to dashboard page.
 *
 * @param request - Next.js request object
 * @param request.url.code - Authorization code from OAuth provider
 * @returns Redirects to /dashboard page, or error response
 * @throws Returns 429 if rate limit exceeded (30 requests/minute)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP (auth callback)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        logger.error("Supabase exchange error", error);
      }
    } catch (error) {
      logger.error("Supabase callback client unavailable", error);
    }
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}