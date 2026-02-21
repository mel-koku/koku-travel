import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unauthorized, badRequest } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { trackApiPerformance } from "@/lib/api/performance";
import type { User } from "@supabase/supabase-js";

/**
 * CORS configuration constants
 */
const CORS_CONFIG = {
  /** Allowed origins for CORS (use env var or default to same-origin only) */
  allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [],
  /** Whether to allow credentials (cookies, auth headers) */
  allowCredentials: true,
  /** Allowed HTTP methods */
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  /** Allowed request headers */
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  /** Headers exposed to the client */
  exposedHeaders: ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  /** Max age for preflight cache (in seconds) */
  maxAge: 86400, // 24 hours
} as const;

/**
 * Body size limits for different content types
 */
export const BODY_SIZE_LIMITS = {
  /** Default max body size (100KB) */
  DEFAULT: 100 * 1024,
  /** Max size for JSON bodies (1MB) */
  JSON: 1024 * 1024,
  /** Max size for form data (5MB) */
  FORM_DATA: 5 * 1024 * 1024,
} as const;

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
 * Validates that a string is a valid IPv4 or IPv6 address
 */
function isValidIpAddress(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/;
  if (ipv4Regex.test(ip)) {
    return true;
  }

  // IPv6 validation (simplified - covers most common formats)
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,6}::(?:[a-fA-F0-9]{1,4})?$/;
  if (ipv6Regex.test(ip)) {
    return true;
  }

  // IPv4-mapped IPv6 (e.g., ::ffff:192.168.1.1)
  const mappedIpv6Regex = /^::ffff:(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/i;
  if (mappedIpv6Regex.test(ip)) {
    return true;
  }

  return false;
}

/**
 * Checks if we should trust proxy headers
 * In production with Vercel/similar platforms, we trust these headers as they're set by the edge
 */
function shouldTrustProxyHeaders(): boolean {
  // Trust proxy headers when running on Vercel (they sanitize and set these headers)
  if (process.env.VERCEL === "1") {
    return true;
  }

  // Trust if explicitly configured (for other trusted proxy setups)
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    return true;
  }

  // In development or test, trust for easier local testing/testing
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return true;
  }

  return false;
}

/**
 * Extracts client IP address from request headers
 * Handles various proxy headers with security validation
 *
 * SECURITY CONSIDERATIONS:
 * - Only trusts proxy headers in appropriate environments (Vercel, development, or explicit config)
 * - Validates IP format to prevent header injection
 * - Falls back to 'unknown' if validation fails
 */
export function getClientIp(request: NextRequest): string {
  const trustProxyHeaders = shouldTrustProxyHeaders();

  if (trustProxyHeaders) {
    // Check x-forwarded-for header (most common in production)
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      // Take the first IP (client IP) if multiple are present
      // Limit to reasonable length to prevent DoS via header inflation
      const firstIp = forwarded.substring(0, 100).split(",")[0]?.trim();
      if (firstIp && isValidIpAddress(firstIp)) {
        return firstIp;
      }
    }

    // Check x-real-ip header (alternative proxy header)
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      const trimmedIp = realIp.substring(0, 45).trim(); // Max IPv6 length
      if (isValidIpAddress(trimmedIp)) {
        return trimmedIp;
      }
    }
  }

  // Fallback for development/local environments or untrusted headers
  logger.warn("IP extraction returned 'unknown' — rate limits will be tightened for this request", {
    path: request.nextUrl.pathname,
  });
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
      error: getErrorMessage(error),
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

/**
 * Checks if the request origin is allowed for CORS
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    // Same-origin requests don't have an Origin header
    return true;
  }

  // In development, allow localhost origins
  if (process.env.NODE_ENV === "development") {
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return true;
    }
  }

  // Check against configured allowed origins
  if (CORS_CONFIG.allowedOrigins.length === 0) {
    // If no origins configured, only allow same-origin (no Origin header)
    return false;
  }

  return CORS_CONFIG.allowedOrigins.includes(origin);
}

/**
 * Adds CORS headers to a response
 * Call this on all API responses to enable cross-origin access
 *
 * @param response - The NextResponse to add headers to
 * @param request - The incoming request (to check Origin header)
 * @returns The response with CORS headers added
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const origin = request.headers.get("origin");

  if (isOriginAllowed(origin)) {
    // Set the specific origin (or omit for same-origin)
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    if (CORS_CONFIG.allowCredentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      CORS_CONFIG.allowedMethods.join(", "),
    );

    response.headers.set(
      "Access-Control-Allow-Headers",
      CORS_CONFIG.allowedHeaders.join(", "),
    );

    response.headers.set(
      "Access-Control-Expose-Headers",
      CORS_CONFIG.exposedHeaders.join(", "),
    );

    response.headers.set(
      "Access-Control-Max-Age",
      String(CORS_CONFIG.maxAge),
    );
  }

  return response;
}

/**
 * Handles CORS preflight (OPTIONS) requests
 * Returns a 204 No Content response with CORS headers if origin is allowed
 *
 * @param request - The incoming OPTIONS request
 * @returns NextResponse with CORS headers, or 403 if origin not allowed
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");

  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, request);
}

/**
 * Validates that a POST/PUT/PATCH request has a JSON Content-Type header.
 * Returns a 400 response if the Content-Type is missing or not JSON.
 * Should be called early in POST handlers that expect JSON bodies.
 */
export function requireJsonContentType(
  request: NextRequest,
  context?: RequestContext,
): NextResponse | null {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 400, headers: context ? { "X-Request-ID": context.requestId } : undefined },
    );
  }
  return null;
}

/**
 * Validates request body size before parsing
 * Returns an error response if the body is too large
 *
 * @param request - The incoming request
 * @param maxSize - Maximum allowed body size in bytes (default: BODY_SIZE_LIMITS.DEFAULT)
 * @param context - Request context for error logging
 * @returns null if body size is acceptable, or a 413 error response if too large
 */
export function checkBodySize(
  request: NextRequest,
  maxSize: number = BODY_SIZE_LIMITS.DEFAULT,
  context?: RequestContext,
): NextResponse | null {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > maxSize) {
      logger.warn("Request body too large", {
        requestId: context?.requestId,
        ip: context?.ip,
        path: request.nextUrl.pathname,
        contentLength: size,
        maxSize,
      });

      return NextResponse.json(
        {
          error: "Request body too large",
          code: "PAYLOAD_TOO_LARGE",
          maxSize,
        },
        { status: 413 },
      );
    }
  }

  return null;
}

/**
 * Validates search/query parameter length to prevent DoS
 *
 * @param value - The parameter value to validate
 * @param maxLength - Maximum allowed length (default: 500)
 * @param paramName - Name of the parameter for error messages
 * @param context - Request context for error logging
 * @returns null if valid, or a 400 error response if too long
 */
export function validateSearchParamLength(
  value: string | null,
  maxLength: number = 500,
  paramName: string = "parameter",
  context?: RequestContext,
): NextResponse | null {
  if (value && value.length > maxLength) {
    logger.warn("Search parameter too long", {
      requestId: context?.requestId,
      paramName,
      length: value.length,
      maxLength,
    });

    return badRequest(
      `${paramName} too long (max ${maxLength} characters)`,
      undefined,
      { requestId: context?.requestId },
    );
  }

  return null;
}

