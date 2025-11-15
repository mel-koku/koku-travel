import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { logger } from "@/lib/logger";
import {
  RATE_LIMIT_AUTH_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  MAX_AUTHORIZATION_CODE_LENGTH,
} from "@/lib/constants";

/**
 * Schema for OAuth authorization code parameter
 */
const authCodeSchema = z
  .string()
  .min(1, "Authorization code cannot be empty")
  .max(MAX_AUTHORIZATION_CODE_LENGTH, "Authorization code too long")
  .regex(/^[A-Za-z0-9._-]+$/, "Authorization code contains invalid characters");

/**
 * GET /api/auth/callback
 * OAuth callback handler for Supabase authentication.
 * Exchanges authorization code for session and redirects to dashboard page.
 *
 * @param request - Next.js request object
 * @param request.url.code - Authorization code from OAuth provider
 * @returns Redirects to /dashboard on success, or /auth/error on failure
 * @throws Returns 429 if rate limit exceeded (30 requests/minute)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP (auth callback)
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: RATE_LIMIT_AUTH_MAX_REQUESTS,
    windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // If no code provided, redirect to error page
  if (!code) {
    logger.warn("Auth callback called without authorization code");
    return NextResponse.redirect(`${origin}/auth/error?message=missing_code`);
  }

  // Validate code format
  const codeValidation = authCodeSchema.safeParse(code);
  if (!codeValidation.success) {
    logger.warn("Invalid authorization code format", {
      errors: codeValidation.error.issues,
    });
    return NextResponse.redirect(`${origin}/auth/error?message=invalid_code`);
  }

  const validatedCode = codeValidation.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(validatedCode);

    if (error) {
      logger.error("Supabase exchange error", error);
      // Determine error type for user feedback
      const errorMessage =
        error.status === 400
          ? "invalid_code"
          : error.status === 401
            ? "expired_code"
            : "authentication_failed";
      return NextResponse.redirect(`${origin}/auth/error?message=${errorMessage}`);
    }

    // Validate session exists before redirecting
    if (!data.session) {
      logger.warn("Session not created after code exchange");
      return NextResponse.redirect(`${origin}/auth/error?message=session_creation_failed`);
    }

    // Success: redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    logger.error("Supabase callback client unavailable", error);
    return NextResponse.redirect(`${origin}/auth/error?message=service_unavailable`);
  }
}