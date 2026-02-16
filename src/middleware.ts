import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

/**
 * Public API routes that skip auth entirely (read-only, no session needed).
 * These get the X-Request-ID header but no supabase.auth.getUser() call.
 */
const PUBLIC_API_ROUTES = [
  "/api/locations",
  "/api/places",
  "/api/health",
  "/api/chat",
];

/**
 * Protected routes that require authentication.
 * These routes will redirect unauthenticated users to the dashboard (which handles login).
 */
const PROTECTED_ROUTES = [
  "/api/trips",
  "/api/favorites",
  "/api/bookmarks",
];

/**
 * Auth-related routes that authenticated users should be redirected away from.
 */
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/signup",
];

/**
 * Checks if a path matches any of the protected route patterns.
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Checks if a path is an auth route.
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Generates a unique request ID for tracing.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Edge middleware for centralized request handling.
 *
 * Responsibilities:
 * 1. Auth session refresh - keeps auth tokens fresh
 * 2. Protected route enforcement - redirects unauthenticated users
 * 3. Request ID generation - for request tracing
 * 4. Request logging
 */
export async function middleware(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Create response to pass through
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Add request ID header for tracing
  response.headers.set("X-Request-ID", requestId);
  response.headers.set("X-Start-Time", String(startTime));

  // Skip auth for public API routes — no session needed, saves a network round-trip
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // Create Supabase client for middleware
  const supabase = createMiddlewareClient(request, response);

  // If Supabase is not configured, skip auth checks
  if (!supabase) {
    return response;
  }

  // Refresh session if needed - this will update cookies on the response
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle protected API routes - return 401 if not authenticated
  if (isProtectedRoute(pathname) && pathname.startsWith("/api/")) {
    if (error || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "UNAUTHORIZED",
          requestId,
        },
        {
          status: 401,
          headers: {
            "X-Request-ID": requestId,
          },
        }
      );
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute(pathname) && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Matcher configuration for the middleware.
 *
 * Includes:
 * - API routes that need auth
 * - Auth pages
 * - Dashboard (for session refresh)
 *
 * Excludes:
 * - Static files (_next/static, images, favicon)
 * - Public API routes (locations, places, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - Static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
