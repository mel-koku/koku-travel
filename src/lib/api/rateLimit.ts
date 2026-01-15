import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "../logger";
import { env } from "../env";

/**
 * Distributed rate limiter with Upstash Redis
 * Falls back to in-memory rate limiting if Redis is not configured
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

// In-memory store for rate limiting (fallback when Redis is not available)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Module-level cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null;

// Upstash Redis client (initialized lazily)
let redisClient: Redis | null = null;
let upstashRatelimit: Ratelimit | null = null;
let redisInitialized = false;
let redisAvailable = false;

/**
 * Initializes Upstash Redis client if credentials are available
 */
function initializeRedis(): void {
  if (redisInitialized) {
    return;
  }
  redisInitialized = true;

  const redisUrl = env.upstashRedisRestUrl;
  const redisToken = env.upstashRedisRestToken;

  if (redisUrl && redisToken) {
    try {
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      // Test connection with a simple ping
      redisClient.ping()
        .then(() => {
          redisAvailable = true;
          logger.info("Upstash Redis rate limiting enabled");
        })
        .catch((error) => {
          logger.warn("Failed to connect to Upstash Redis, falling back to in-memory rate limiting", {
            error: error instanceof Error ? error.message : String(error),
          });
          redisAvailable = false;
        });
    } catch (error) {
      logger.warn("Failed to initialize Upstash Redis, falling back to in-memory rate limiting", {
        error: error instanceof Error ? error.message : String(error),
      });
      redisAvailable = false;
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      logger.warn(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not configured. " +
        "Using in-memory rate limiting which will NOT work correctly with multiple server instances. " +
        "Consider configuring Upstash Redis for production deployments.",
      );
    }
    redisAvailable = false;
  }
}

/**
 * Creates or gets Upstash Ratelimit instance
 */
function getUpstashRatelimit(config: RateLimitConfig): Ratelimit | null {
  if (!redisAvailable || !redisClient) {
    return null;
  }

  if (!upstashRatelimit) {
    upstashRatelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      analytics: true,
      prefix: "@koku-travel/ratelimit",
    });
  }

  return upstashRatelimit;
}

// Cleanup function to ensure interval is cleared
function cleanupRateLimitStore(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Cleanup old entries every 5 minutes (for in-memory fallback)
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
 * In-memory rate limiting (fallback when Redis is not available)
 */
async function checkRateLimitInMemory(
  ip: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; retryAfter?: number; resetAt?: number; remaining?: number }> {
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
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;
  rateLimitStore.set(ip, entry);

  if (entry.count > config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      resetAt: entry.resetAt,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Checks if a request should be rate limited
 * Uses Upstash Redis if available, otherwise falls back to in-memory rate limiting
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration (default: 100 requests per minute)
 * @returns null if allowed, or a NextResponse with 429 status if rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60 * 1000 },
): Promise<NextResponse | null> {
  // Initialize Redis on first call
  initializeRedis();

  const ip = getClientIp(request);

  try {
    // Try to use Upstash Redis if available
    const ratelimit = getUpstashRatelimit(config);
    if (ratelimit) {
      const result = await ratelimit.limit(ip);
      
      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
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
    }
  } catch (error) {
    // If Redis fails, log and fall back to in-memory
    logger.warn("Redis rate limiting failed, falling back to in-memory", {
      error: error instanceof Error ? error.message : String(error),
      ip,
    });
  }

  // Fallback to in-memory rate limiting
  const result = await checkRateLimitInMemory(ip, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter || 60),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": String(result.remaining || 0),
          "X-RateLimit-Reset": String(result.resetAt || Date.now() + config.windowMs),
        },
      },
    );
  }

  // Request allowed
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
