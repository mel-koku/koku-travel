import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "../logger";
import { env } from "../env";
import { getClientIp } from "./middleware";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Rate limit configuration constants
 */
const RATE_LIMIT_CONSTANTS = {
  /** Interval for cleaning up expired entries in memory store (ms) */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  /** Maximum page number for pagination safety */
  MAX_PAGINATION_PAGE: 100,
  /** Prefix for Upstash Redis rate limit keys */
  REDIS_KEY_PREFIX: "@koku-travel/ratelimit",
} as const;

/**
 * Distributed rate limiter with Upstash Redis
 * Falls back to in-memory rate limiting if Redis is not configured
 *
 * Rate limit tiers (rationale):
 * - /api/locations: 100 req/min — high-traffic browse/search; paginated so each page = 1 req
 * - /api/places/*: 60 req/min — proxies Google Places API (cost-sensitive)
 * - /api/itinerary/plan: 20 req/min — expensive AI generation, one plan per user session
 * - /api/itinerary/refine: 30 req/min — lighter AI refinement, but still costly
 * - /api/itinerary/availability: 30 req/min — Supabase reads, moderate
 * - /api/routing/*: 100 req/min — proxies Mapbox/Google routing (batched per day)
 * - /api/health: 200 req/min — lightweight health check, generous for monitoring
 * - /api/sanity/webhook: 30 req/min — Sanity publishes infrequently; protects against replay
 *
 * In-memory fallback is suitable for single-instance dev only.
 * Production MUST use Upstash Redis for consistent limits across serverless instances.
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
const upstashRatelimitInstances = new Map<string, Ratelimit>();
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
            error: getErrorMessage(error),
          });
          redisAvailable = false;
        });
    } catch (error) {
      logger.warn("Failed to initialize Upstash Redis, falling back to in-memory rate limiting", {
        error: getErrorMessage(error),
      });
      redisAvailable = false;
    }
  } else {
    const envLevel = getEnvironmentLevel();
    const isVercelProduction = process.env.VERCEL_ENV === "production";
    const enforceRedis = process.env.ENFORCE_REDIS_RATE_LIMIT !== "false";

    if (isVercelProduction) {
      // Vercel production: Redis is unconditionally required — ENFORCE_REDIS_RATE_LIMIT bypass
      // is NOT allowed because in-memory rate limiting is per-instance in serverless.
      const errorMessage =
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in Vercel production. " +
        "In-memory rate limiting does NOT work with serverless instances. " +
        "Please configure Upstash Redis for production deployments.";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    } else if (envLevel === "production" && enforceRedis) {
      // Non-Vercel production with enforcement enabled
      const errorMessage =
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. " +
        "In-memory rate limiting does NOT work correctly with multiple server instances. " +
        "Please configure Upstash Redis for production deployments. " +
        "To temporarily bypass this check, set ENFORCE_REDIS_RATE_LIMIT=false (not recommended).";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    } else if (envLevel === "production") {
      // Non-Vercel production with bypass
      logger.error(
        "CRITICAL: Running production without Redis rate limiting. " +
        "This MUST be resolved. Configure Upstash Redis and set ENFORCE_REDIS_RATE_LIMIT=true.",
        new Error("Rate limit bypass in production"),
        { environment: envLevel, vercelEnv: process.env.VERCEL_ENV },
      );
    } else if (envLevel === "preview") {
      // Preview/staging with bypass - warning only
      logger.warn(
        "Running in preview without Redis rate limiting (ENFORCE_REDIS_RATE_LIMIT=false). " +
        "Acceptable for preview/staging, not for production.",
        { vercelEnv: process.env.VERCEL_ENV || "unknown" },
      );
    } else {
      logger.warn(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not configured. " +
        "Using in-memory rate limiting (development only).",
      );
    }
    redisAvailable = false;
  }
}

/**
 * Determines the current environment level for rate limiting decisions
 * @returns 'development', 'preview', or 'production'
 */
function getEnvironmentLevel(): "development" | "preview" | "production" {
  // VERCEL_ENV takes precedence when set
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  // Fall back to NODE_ENV
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

/**
 * Creates or gets Upstash Ratelimit instance for a specific config.
 * Each unique maxRequests+windowMs combination gets its own instance.
 */
function getUpstashRatelimit(config: RateLimitConfig): Ratelimit | null {
  if (!redisAvailable || !redisClient) {
    return null;
  }

  const key = `${config.maxRequests}:${config.windowMs}`;
  let instance = upstashRatelimitInstances.get(key);
  if (!instance) {
    instance = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      analytics: true,
      prefix: RATE_LIMIT_CONSTANTS.REDIS_KEY_PREFIX,
    });
    upstashRatelimitInstances.set(key, instance);
  }

  return instance;
}

// Cleanup function to ensure interval is cleared
function cleanupRateLimitStore(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Initialize cleanup interval only once (prevent memory leaks on module reload)
let cleanupInitialized = false;

// Cleanup old entries every 5 minutes (for in-memory fallback)
if (typeof process !== "undefined" && !cleanupInitialized) {
  // Clear any existing interval before creating a new one (handles module reload)
  cleanupRateLimitStore();
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(ip);
      }
    }
  }, RATE_LIMIT_CONSTANTS.CLEANUP_INTERVAL_MS);

  // Cleanup on process exit
  const cleanupOnExit = () => {
    cleanupRateLimitStore();
  };
  
  // Register cleanup handlers (only once)
  if (process.listenerCount("SIGTERM") === 0) {
    process.on("SIGTERM", cleanupOnExit);
  }
  if (process.listenerCount("SIGINT") === 0) {
    process.on("SIGINT", cleanupOnExit);
  }
  if (process.listenerCount("uncaughtException") === 0) {
    process.on("uncaughtException", cleanupOnExit);
  }
  if (process.listenerCount("unhandledRejection") === 0) {
    process.on("unhandledRejection", cleanupOnExit);
  }
  
  cleanupInitialized = true;
  
  // Cleanup on module unload (for development hot reload)
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    // In Next.js, modules can be reloaded, so we need to handle cleanup
    // This is a best-effort cleanup for development
    const originalExit = process.exit;
    process.exit = function(code?: number): never {
      cleanupRateLimitStore();
      originalExit.call(process, code);
      // This will never be reached, but satisfies TypeScript's never return type
      throw new Error("Process exit should not return");
    };
  }
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

  const clientIp = getClientIp(request);
  // Include the endpoint path in the key so different endpoints have separate rate limits
  const pathname = request.nextUrl.pathname;
  const ip = `${clientIp}:${pathname}`;

  // Tighten limits for unidentifiable clients to prevent bypass via missing headers
  const effectiveConfig = clientIp === "unknown"
    ? { ...config, maxRequests: Math.min(config.maxRequests, 20) }
    : config;

  try {
    // Try to use Upstash Redis if available
    const ratelimit = getUpstashRatelimit(effectiveConfig);
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
              "X-RateLimit-Limit": String(effectiveConfig.maxRequests),
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
      error: getErrorMessage(error),
      ip,
    });
  }

  // Fallback to in-memory rate limiting
  const result = await checkRateLimitInMemory(ip, effectiveConfig);

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
          "X-RateLimit-Limit": String(effectiveConfig.maxRequests),
          "X-RateLimit-Remaining": String(result.remaining || 0),
          "X-RateLimit-Reset": String(result.resetAt || Date.now() + effectiveConfig.windowMs),
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
