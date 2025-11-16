import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "../logger";
import { env } from "../env";

/**
 * Distributed rate limiter using Upstash Redis
 * Falls back to in-memory rate limiting for local development if Upstash is not configured
 * 
 * IMPORTANT PRODUCTION REQUIREMENT:
 * - Upstash Redis is REQUIRED for production deployments
 * - In-memory rate limiting does NOT work across multiple server instances
 * - Without Upstash, rate limits will not be enforced correctly in distributed environments
 * - Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables for production
 * 
 * RATE LIMIT CONFIGURATIONS:
 * - Default config (100 req/min): Uses Upstash Redis if configured ✅ Production-ready
 * - Custom configs: 
 *   - If Upstash is configured: Falls back to in-memory (⚠️ NOT production-ready)
 *   - If Upstash is NOT configured: Uses in-memory (⚠️ Development only)
 *   - In production: Custom configs will throw an error if Upstash is not configured
 * 
 * RECOMMENDATION FOR PRODUCTION:
 * - Use the default config (100 req/min) for most endpoints
 * - For endpoints requiring different limits, use the default and implement additional
 *   application-level throttling if needed
 * - Alternatively, create multiple Upstash Ratelimit instances for different configs
 * 
 * CURRENT USAGE:
 * - /api/locations: 100 req/min (default) ✅
 * - /api/places/*: 60 req/min (custom) ⚠️ Falls back to in-memory if Upstash configured
 * - /api/revalidate: 20 req/min (custom) ⚠️ Falls back to in-memory if Upstash configured
 * - /api/preview: 20 req/min (custom) ⚠️ Falls back to in-memory if Upstash configured
 * - /api/routing/*: 100 req/min (default) ✅
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
const upstashRedisUrl = env.upstashRedisRestUrl;
const upstashRedisToken = env.upstashRedisRestToken;
const useUpstash = !!(upstashRedisUrl && upstashRedisToken);

// Initialize Upstash Redis client if configured
// Note: Upstash Ratelimit requires limit/window to be set at instance creation.
// We use a default of 100 requests per minute. For custom configs, we fall back to in-memory.
let redisClient: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

if (useUpstash) {
  try {
    redisClient = new Redis({
      url: upstashRedisUrl,
      token: upstashRedisToken,
    });
    logger.info("Upstash Redis rate limiting enabled");
  } catch (error) {
    logger.warn("Failed to initialize Upstash Redis, falling back to in-memory rate limiting", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
} else {
  // Note: We don't throw here during build time, but will check at runtime
  // The check happens in checkRateLimit() function when actually handling requests
}

function getLimiterKey(config: RateLimitConfig): string {
  return `${config.maxRequests}:${config.windowMs}`;
}

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redisClient) {
    return null;
  }

  const key = getLimiterKey(config);
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
      analytics: true,
    });
    limiterCache.set(key, limiter);
  }

  return limiter;
}

// Fallback: In-memory store for local development
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

// Cleanup old entries every 5 minutes (only for in-memory fallback)
if (!useUpstash && typeof process !== "undefined") {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Cleanup on process exit (all environments)
  const cleanupOnExit = () => {
    cleanupRateLimitStore();
  };
  
  process.on("SIGTERM", cleanupOnExit);
  process.on("SIGINT", cleanupOnExit);
  // Also cleanup on uncaught exceptions to prevent memory leaks
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
 * Uses Upstash Redis if configured, otherwise falls back to in-memory rate limiting
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration (default: 100 requests per minute)
 * @returns null if allowed, or a NextResponse with 429 status if rate limited
 * 
 * @remarks
 * - Custom configs (non-default) fall back to in-memory rate limiting
 * - In-memory rate limiting does NOT work across multiple server instances
 * - For production with custom limits, Upstash Redis is required
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: DEFAULT_MAX_REQUESTS, windowMs: DEFAULT_WINDOW_MS },
): Promise<NextResponse | null> {
  const ip = getClientIp(request);

  if (useUpstash) {
    try {
      const limiter = getUpstashLimiter(config);
      if (!limiter) {
        throw new Error("Upstash limiter is unavailable.");
      }
      const result = await limiter.limit(ip);

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
        config,
      });
      // Fall through to in-memory implementation
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Upstash Redis environment variables are required for rate limiting in production. " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN or disable rate limiting explicitly.",
    );
  }

  // Fallback: In-memory rate limiting (for local development only)
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
