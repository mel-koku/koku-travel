/**
 * Per-user daily quota enforcement using Upstash Redis
 *
 * Caps total daily usage of expensive endpoints (Gemini AI, Google Places)
 * to control costs during public testing. Works alongside per-minute rate
 * limiting -- rate limits handle burst abuse, daily quotas handle sustained use.
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { logger } from "../logger";
import { env } from "../env";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/** Redis key prefix for daily quotas */
const QUOTA_KEY_PREFIX = "@yuku-japan/daily-quota";

/** TTL for quota keys: 25 hours (handles timezone edges) */
const QUOTA_TTL_SECONDS = 25 * 60 * 60;

export type DailyQuotaConfig = {
  /** Identifier for the quota (used in Redis key, e.g., "itinerary-plan") */
  name: string;
  /** Maximum requests allowed per calendar day */
  maxPerDay: number;
};

export type DailyQuotaCheckOptions = {
  /** Whether the caller is unauthenticated. When true, error copy nudges sign-in. */
  isAnonymous?: boolean;
};

/** Redis client (initialized lazily, shared across calls) */
let redisClient: Redis | null = null;
let redisInitialized = false;
let redisAvailable = false;

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
      redisAvailable = true;
    } catch (error) {
      logger.warn("Failed to initialize Redis for daily quotas", {
        error: getErrorMessage(error),
      });
      redisAvailable = false;
    }
  } else {
    logger.debug("Redis not configured for daily quotas, enforcement disabled");
    redisAvailable = false;
  }
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // yyyy-mm-dd in UTC
}

function getResetTimestamp(): number {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Check and increment a daily quota for a given identifier.
 *
 * @param identifier - User ID (authenticated) or IP address (anonymous)
 * @param config - Quota configuration (name + maxPerDay)
 * @param options - Optional caller context (e.g., whether the request is unauthenticated)
 * @returns null if allowed, or a 429 NextResponse if quota exceeded
 */
export async function checkDailyQuota(
  identifier: string,
  config: DailyQuotaConfig,
  options: DailyQuotaCheckOptions = {},
): Promise<NextResponse | null> {
  initializeRedis();

  if (!redisAvailable || !redisClient) {
    // No Redis = no quota enforcement (dev mode). Production requires Redis
    // via rateLimit.ts Vercel enforcement, so this only hits in development.
    return null;
  }

  const key = `${QUOTA_KEY_PREFIX}:${identifier}:${config.name}:${getTodayKey()}`;

  try {
    // Atomic increment -- returns the new count after incrementing
    const count = await redisClient.incr(key);

    // Set TTL on first request of the day (count === 1)
    if (count === 1) {
      await redisClient.expire(key, QUOTA_TTL_SECONDS);
    }

    const resetAt = getResetTimestamp();

    if (count > config.maxPerDay) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

      logger.warn("Daily quota exceeded", {
        identifier: identifier.includes("@") ? "[redacted]" : identifier,
        quota: config.name,
        count,
        limit: config.maxPerDay,
        isAnonymous: options.isAnonymous ?? false,
      });

      // Anonymous callers share an IP-keyed quota that depletes fast on shared
      // networks (hotels, airports, cafés). Signing in moves them to a per-user
      // quota and recovers their access immediately, so we nudge that path.
      const errorMessage = options.isAnonymous
        ? "You've reached today's limit for anonymous use. Sign in to keep planning, or come back tomorrow."
        : "You've reached today's generation limit. Try again tomorrow.";

      return NextResponse.json(
        {
          error: errorMessage,
          code: "DAILY_QUOTA_EXCEEDED",
          retryAfter,
          isAnonymous: options.isAnonymous ?? false,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-DailyQuota-Limit": String(config.maxPerDay),
            "X-DailyQuota-Remaining": "0",
            "X-DailyQuota-Reset": String(resetAt),
          },
        },
      );
    }

    // Allowed -- no response body, but headers will be added by withApiHandler
    return null;
  } catch (error) {
    // Fail open: if Redis errors mid-request, allow the request through.
    // Per-minute rate limiting still protects against burst abuse.
    logger.error("Daily quota check failed, allowing request", undefined, {
      error: getErrorMessage(error),
      quota: config.name,
    });
    return null;
  }
}

/** Reset functions for testing */
export function _resetForTesting(): void {
  redisClient = null;
  redisInitialized = false;
  redisAvailable = false;
}
