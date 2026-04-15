import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Cost-based rate limiting using Upstash Redis.
 *
 * Counters are stored in tenths-of-a-cent to avoid float drift.
 * Response values expose whole cents for client readability.
 */

export type Scope = "user" | "global";

export type BudgetSnapshot = {
  usedCents: number;
  limitCents: number;
  resetAt: string;
};

export type BudgetStatus = {
  user: BudgetSnapshot;
  global: BudgetSnapshot;
};

const USER_DAILY_LIMIT_TC = 2000;
const GLOBAL_HOURLY_LIMIT_TC = 50000;

const DAILY_TTL_SECONDS = 26 * 60 * 60;
const HOURLY_TTL_SECONDS = 2 * 60 * 60;

type RedisLike = Pick<Redis, "get" | "incrby" | "expire" | "del" | "set">;

let redis: RedisLike | null = null;
let initialized = false;

function getRedis(): RedisLike | null {
  if (initialized) return redis;
  initialized = true;

  const url = env.upstashRedisRestUrl;
  const token = env.upstashRedisRestToken;
  if (url && token) {
    try {
      redis = new Redis({ url, token });
    } catch (error) {
      logger.warn("costLimit: failed to init Redis, cost limiting degraded", {
        error: getErrorMessage(error),
      });
      redis = null;
    }
  }
  return redis;
}

export function __setRedisForTests(fake: RedisLike | null): void {
  redis = fake;
  initialized = true;
}

export function __resetCostLimitForTests(): void {
  redis = null;
  initialized = false;
}

function yyyymmdd(d = new Date()): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function yyyymmddhh(d = new Date()): string {
  return d.toISOString().slice(0, 13).replace(/[-T]/g, "");
}

function endOfUtcDay(now = new Date()): string {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

function endOfUtcHour(now = new Date()): string {
  const d = new Date(now);
  d.setUTCMinutes(60, 0, 0);
  return d.toISOString();
}

function dailyKey(userKey: string, now = new Date()): string {
  return `cost:daily:${userKey}:${yyyymmdd(now)}`;
}

function hourlyKey(now = new Date()): string {
  return `cost:global:hourly:${yyyymmddhh(now)}`;
}

function tcToCents(tc: number): number {
  return Math.round(tc / 10);
}

async function readCounter(key: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  try {
    const value = await client.get(key);
    if (value === null || value === undefined) return 0;
    return typeof value === "number" ? value : Number(value) || 0;
  } catch (error) {
    logger.warn("costLimit: readCounter failed", { key, error: getErrorMessage(error) });
    return 0;
  }
}

export async function checkCostBudget(userKey: string): Promise<BudgetStatus> {
  const now = new Date();
  const [dailyTc, hourlyTc] = await Promise.all([
    readCounter(dailyKey(userKey, now)),
    readCounter(hourlyKey(now)),
  ]);

  return {
    user: {
      usedCents: tcToCents(dailyTc),
      limitCents: tcToCents(USER_DAILY_LIMIT_TC),
      resetAt: endOfUtcDay(now),
    },
    global: {
      usedCents: tcToCents(hourlyTc),
      limitCents: tcToCents(GLOBAL_HOURLY_LIMIT_TC),
      resetAt: endOfUtcHour(now),
    },
  };
}
