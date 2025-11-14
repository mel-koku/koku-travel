import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based solution (e.g., Upstash)
 */

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
};

type RateLimitEntry = {
  count: number;
  resetAt: number; // Timestamp when the window resets
};

// In-memory store: IP -> RateLimitEntry
// In production, this should be replaced with Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Cleanup on process exit (for development)
  if (process.env.NODE_ENV !== "production") {
    process.on("SIGTERM", () => clearInterval(cleanupInterval));
    process.on("SIGINT", () => clearInterval(cleanupInterval));
  }
}

/**
 * Gets the client IP address from the request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback (useful for development)
  return request.ip || "unknown";
}

/**
 * Checks if a request should be rate limited
 * @returns null if allowed, or a NextResponse with 429 status if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60 * 1000 }, // Default: 100 requests per minute
): NextResponse | null {
  const ip = getClientIp(request);
  const now = Date.now();

  // Get or create entry for this IP
  let entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(ip, entry);
    return null; // Allowed
  }

  // Increment count
  entry.count += 1;

  if (entry.count > config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetAt),
        },
      },
    );
  }

  // Update store
  rateLimitStore.set(ip, entry);

  // Return remaining count in headers (for debugging/monitoring)
  const remaining = Math.max(0, config.maxRequests - entry.count);
  return null; // Allowed, but we'll add headers via middleware pattern
}

/**
 * Rate limit middleware wrapper for API routes
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const rateLimitResponse = checkRateLimit(request, { maxRequests: 50, windowMs: 60000 });
 *   if (rateLimitResponse) return rateLimitResponse;
 *   // ... rest of handler
 * }
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config?: RateLimitConfig,
) {
  return async (request: NextRequest, ...args: any[]) => {
    const rateLimitResponse = checkRateLimit(request, config);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request, ...args);
  };
}

