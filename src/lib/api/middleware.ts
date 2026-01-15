import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { trackApiPerformance } from "@/lib/api/performance";
import type { User } from "@supabase/supabase-js";

/**
 * Request context that gets passed through middleware
 */
export type RequestContext = {
  requestId: string;
  user?: User;
  ip: string;
};

/**
 * Generates a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Extracts client IP address from request headers
 * Handles various proxy headers and falls back to 'unknown' if not available
 */
export function getClientIp(request: NextRequest): string {
  // Check x-forwarded-for header (most common in production)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (client IP) if multiple are present
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  // Check x-real-ip header (alternative proxy header)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback for development/local environments
  return "unknown";
}

/**
 * Creates request context with ID and IP
 * This should be called at the start of every API route handler
 */
export function createRequestContext(request: NextRequest): RequestContext {
  const requestId = generateRequestId();
  const ip = getClientIp(request);
  
  return {
    requestId,
    ip,
  };
}

/**
 * Middleware to require authentication
 * Returns the authenticated user or an error response
 */
export async function requireAuth(
  request: NextRequest,
  context?: RequestContext,
): Promise<{ user: User; context: RequestContext } | NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      logger.warn("Unauthenticated API request", {
        requestId: context?.requestId,
        ip: context?.ip,
        path: request.nextUrl.pathname,
      });
      return unauthorized("Authentication required");
    }

    const finalContext: RequestContext = {
      ...(context || createRequestContext(request)),
      user,
    };

    return { user, context: finalContext };
  } catch (error) {
    logger.error("Error checking authentication", error instanceof Error ? error : new Error(String(error)), {
      requestId: context?.requestId,
      ip: context?.ip,
      path: request.nextUrl.pathname,
    });
    return unauthorized("Authentication check failed");
  }
}

/**
 * Middleware to optionally get authenticated user
 * Returns user if authenticated, null if not (no error)
 */
export async function getOptionalAuth(
  request: NextRequest,
  context?: RequestContext,
): Promise<{ user: User | null; context: RequestContext }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const finalContext: RequestContext = {
      ...(context || createRequestContext(request)),
      user: user || undefined,
    };

    return { user: user || null, context: finalContext };
  } catch (error) {
    logger.warn("Error getting optional auth", {
      requestId: context?.requestId,
      ip: context?.ip,
      error: error instanceof Error ? error.message : String(error),
    });
    
    const finalContext: RequestContext = {
      ...(context || createRequestContext(request)),
    };
    
    return { user: null, context: finalContext };
  }
}

/**
 * Adds request context to response headers for debugging
 * Also tracks performance metrics
 */
export function addRequestContextHeaders(
  response: NextResponse,
  context: RequestContext,
  request?: NextRequest,
): NextResponse {
  response.headers.set("X-Request-ID", context.requestId);
  if (context.user) {
    response.headers.set("X-User-ID", context.user.id);
  }

  // Track performance if request is provided
  if (request) {
    const startTime = request.headers.get("x-start-time");
    if (startTime) {
      const duration = Date.now() - Number.parseInt(startTime, 10);
      trackApiPerformance(
        request.nextUrl.pathname,
        request.method,
        duration,
        response.status,
        context,
      );
    }
  }

  return response;
}

