import { NextRequest, NextResponse } from "next/server";
import { logger } from "../logger";

/**
 * In-memory rate limiter
 * 
 * NOTE: This implementation only works for single-instance deployments.
 * For production with multiple server instances, consider using a distributed
 * rate limiting solution like Upstash Redis or similar.
 * 
 * CURRENT USAGE:
 * - /api/locations: 100 req/min
 * - /api/places/*: 60 req/min
 * - /api/itinerary/plan: 20 req/min
 * - /api/itinerary/refine: 30 req/min
 * - /api/routing/*: 100 req/min
 */

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
};

type RateLimitEntry = {
  count: number;
  resetAt: number; // Timestamp when the window resets
};

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Module-level cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null;

// Cleanup function to ensure interval is cleared
function cleanupRateLimitStore(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Cleanup old entries every 5 minutes
if (typeof process !== "undefined") {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Cleanup on process exit
  const cleanupOnExit = () => {
    cleanupRateLimitStore();
  };
  
  process.on("SIGTERM", cleanupOnExit);
  process.on("SIGINT", cleanupOnExit);
  process.on("uncaughtException", cleanupOnExit);
  process.on("unhandledRejection", cleanupOnExit);
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
  // Note: request.ip is not available in Next.js App Router
  return "unknown";
}

/**
 * Checks if a request should be rate limited
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration (default: 100 requests per minute)
 * @returns null if allowed, or a NextResponse with 429 status if rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60 * 1000 },
): Promise<NextResponse | null> {
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

  // Return null to indicate request is allowed
  return null;
}

/**
 * Rate limit middleware wrapper for API routes
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const rateLimitResponse = await checkRateLimit(request, { maxRequests: 50, windowMs: 60000 });
 *   if (rateLimitResponse) return rateLimitResponse;
 *   // ... rest of handler
 * }
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  config?: RateLimitConfig,
) {
  return async (request: NextRequest, ...args: unknown[]) => {
    const rateLimitResponse = await checkRateLimit(request, config);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request, ...args);
  };
}
