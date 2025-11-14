import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "../logger";

/**
 * Distributed rate limiter using Upstash Redis
 * Falls back to in-memory rate limiting for local development if Upstash is not configured
 */

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
};

type RateLimitEntry = {
  count: number;
  resetAt: number; // Timestamp when the window resets
};

// Check if Upstash Redis is configured
const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = !!(upstashRedisUrl && upstashRedisToken);

// Initialize Upstash Redis client if configured
// Note: Upstash Ratelimit requires limit/window to be set at instance creation.
// We use a default of 100 requests per minute. For custom configs, we fall back to in-memory.
let redisClient: Redis | null = null;
let upstashRatelimit: Ratelimit | null = null;
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

if (useUpstash) {
  try {
    redisClient = new Redis({
      url: upstashRedisUrl,
      token: upstashRedisToken,
    });
    upstashRatelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(DEFAULT_MAX_REQUESTS, `${DEFAULT_WINDOW_MS}ms`),
      analytics: true,
    });
    logger.info("Upstash Redis rate limiting enabled");
  } catch (error) {
    logger.warn("Failed to initialize Upstash Redis, falling back to in-memory rate limiting", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Fallback: In-memory store for local development
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes (only for in-memory fallback)
if (!useUpstash && typeof globalThis !== "undefined") {
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
  // Note: request.ip is not available in Next.js App Router
  return "unknown";
}

/**
 * Checks if a request should be rate limited
 * Uses Upstash Redis if configured, otherwise falls back to in-memory rate limiting
 * @returns null if allowed, or a NextResponse with 429 status if rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60 * 1000 }, // Default: 100 requests per minute
): Promise<NextResponse | null> {
  const ip = getClientIp(request);

  // Use Upstash Redis if configured and config matches default
  // Note: Upstash Ratelimit requires limit/window at instance creation, so we only use it
  // for the default config. Custom configs fall back to in-memory rate limiting.
  if (
    useUpstash &&
    upstashRatelimit &&
    config.maxRequests === DEFAULT_MAX_REQUESTS &&
    config.windowMs === DEFAULT_WINDOW_MS
  ) {
    try {
      const result = await upstashRatelimit.limit(ip);

      if (!result.success) {
        // Rate limited
        const retryAfter = Math.ceil(result.reset / 1000);
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
              "X-RateLimit-Remaining": String(result.remaining),
              "X-RateLimit-Reset": String(result.reset),
            },
          },
        );
      }

      // Request allowed
      return null;
    } catch (error) {
      // If Upstash fails, log and fall back to in-memory
      logger.warn("Upstash rate limit check failed, falling back to in-memory", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fall through to in-memory implementation
    }
  }

  // Fallback: In-memory rate limiting (for local development)
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
  return null; // Allowed, but we'll add headers via middleware pattern
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

