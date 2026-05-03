import "server-only";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { estimateCostTenthsCent, groundingFeeTenthsCent } from "./costPrices";

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

const RESERVATION_TTL_SECONDS = 5 * 60;

type ReservationRecord = {
  userKey: string;
  reservedTc: number;
  model: string;
  inputTokens: number;
  createdAt: string;
};

export type ReserveOpts = {
  key: string;
  model: string;
  inputTokens: number;
  maxOutputTokens: number;
};

export type ReserveResult =
  | { allowed: true; reservationId: string; reservedCents: number }
  | {
      allowed: false;
      scope: Scope;
      usedCents: number;
      limitCents: number;
      resetAt: string;
    };

function reservationKey(id: string): string {
  return `cost:reservation:${id}`;
}

async function incrBy(
  key: string,
  amount: number,
  ttlSeconds: number,
): Promise<number> {
  const client = getRedis();
  if (!client) throw new Error("redis_unavailable");
  const next = await client.incrby(key, amount);
  if (amount > 0) {
    await client.expire(key, ttlSeconds);
  }
  return next;
}

export async function reserveCost(opts: ReserveOpts): Promise<ReserveResult> {
  const now = new Date();
  const reservedTc = estimateCostTenthsCent(
    opts.model,
    opts.inputTokens,
    opts.maxOutputTokens,
  );
  const dKey = dailyKey(opts.key, now);
  const hKey = hourlyKey(now);

  // Per-user check: fail-open on error
  let dailyAfter: number;
  let dailyIncrementApplied = false;
  try {
    dailyAfter = await incrBy(dKey, reservedTc, DAILY_TTL_SECONDS);
    dailyIncrementApplied = true;
  } catch (error) {
    logger.warn("costLimit: per-user INCRBY failed, failing open", {
      key: opts.key,
      error: getErrorMessage(error),
    });
    dailyAfter = 0;
  }

  if (dailyAfter > USER_DAILY_LIMIT_TC) {
    if (dailyIncrementApplied) {
      try {
        await incrBy(dKey, -reservedTc, DAILY_TTL_SECONDS);
      } catch (error) {
        logger.warn("costLimit: per-user rollback failed", {
          error: getErrorMessage(error),
        });
      }
    }
    return {
      allowed: false,
      scope: "user",
      usedCents: tcToCents(dailyAfter - reservedTc),
      limitCents: tcToCents(USER_DAILY_LIMIT_TC),
      resetAt: endOfUtcDay(now),
    };
  }

  // Global check: fail-closed on error
  let hourlyAfter: number;
  try {
    hourlyAfter = await incrBy(hKey, reservedTc, HOURLY_TTL_SECONDS);
  } catch (error) {
    logger.error(
      "costLimit: global INCRBY failed, failing closed",
      error instanceof Error ? error : new Error(getErrorMessage(error)),
    );
    if (dailyIncrementApplied) {
      try {
        await incrBy(dKey, -reservedTc, DAILY_TTL_SECONDS);
      } catch {
        /* best effort */
      }
    }
    return {
      allowed: false,
      scope: "global",
      usedCents: 0,
      limitCents: tcToCents(GLOBAL_HOURLY_LIMIT_TC),
      resetAt: endOfUtcHour(now),
    };
  }

  if (hourlyAfter > GLOBAL_HOURLY_LIMIT_TC) {
    if (dailyIncrementApplied) {
      try {
        await incrBy(dKey, -reservedTc, DAILY_TTL_SECONDS);
      } catch {
        /* best effort */
      }
    }
    try {
      await incrBy(hKey, -reservedTc, HOURLY_TTL_SECONDS);
    } catch {
      /* best effort */
    }
    return {
      allowed: false,
      scope: "global",
      usedCents: tcToCents(hourlyAfter - reservedTc),
      limitCents: tcToCents(GLOBAL_HOURLY_LIMIT_TC),
      resetAt: endOfUtcHour(now),
    };
  }

  const reservationId = randomUUID();
  const client = getRedis();

  // Fire-and-forget 75% threshold warnings, deduped per key per window via Redis.
  // Uses logger.error so they surface in Sentry.
  void (async () => {
    if (!client) return;
    try {
      if (dailyAfter >= USER_DAILY_LIMIT_TC * 0.75) {
        const warnKey = `cost:warn:user:${dailyKey(opts.key, now)}`;
        const alreadyWarned = await client.get(warnKey);
        if (!alreadyWarned) {
          await client.set(warnKey, "1");
          await client.expire(warnKey, DAILY_TTL_SECONDS);
          logger.error(
            "costLimit: user daily budget at 75%+",
            new Error("cost_budget_warning"),
            {
              scope: "user",
              key: opts.key,
              usedCents: tcToCents(dailyAfter),
              limitCents: tcToCents(USER_DAILY_LIMIT_TC),
            },
          );
        }
      }
      if (hourlyAfter >= GLOBAL_HOURLY_LIMIT_TC * 0.75) {
        const warnKey = `cost:warn:global:${hourlyKey(now)}`;
        const alreadyWarned = await client.get(warnKey);
        if (!alreadyWarned) {
          await client.set(warnKey, "1");
          await client.expire(warnKey, HOURLY_TTL_SECONDS);
          logger.error(
            "costLimit: global hourly budget at 75%+",
            new Error("cost_budget_warning"),
            {
              scope: "global",
              usedCents: tcToCents(hourlyAfter),
              limitCents: tcToCents(GLOBAL_HOURLY_LIMIT_TC),
            },
          );
        }
      }
    } catch {
      /* best effort — don't block reservation on warn failure */
    }
  })();

  if (client) {
    try {
      const record: ReservationRecord = {
        userKey: opts.key,
        reservedTc,
        model: opts.model,
        inputTokens: opts.inputTokens,
        createdAt: now.toISOString(),
      };
      await client.set(reservationKey(reservationId), JSON.stringify(record));
      await client.expire(reservationKey(reservationId), RESERVATION_TTL_SECONDS);
    } catch (error) {
      logger.warn("costLimit: failed to persist reservation record", {
        reservationId,
        error: getErrorMessage(error),
      });
    }
  }

  return {
    allowed: true,
    reservationId,
    reservedCents: tcToCents(reservedTc),
  };
}

export async function reconcileCost(
  reservationId: string,
  actualUsage: {
    promptTokens: number;
    completionTokens: number;
    /**
     * Number of LLM calls in this reservation that hit Vertex AI Search
     * grounding (i.e. {@link callVertexGroundedText} where the model actually
     * issued ≥1 search query). Each one bills $0.035 on top of token cost; see
     * {@link groundingFeeTenthsCent}. Default 0 so non-grounded callers
     * (chat, guide-prose-only flows) are unaffected.
     */
    groundedRequestCount?: number;
  },
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  let raw: unknown;
  try {
    raw = await client.get(reservationKey(reservationId));
  } catch (error) {
    logger.warn("costLimit: reconcileCost get failed", {
      reservationId,
      error: getErrorMessage(error),
    });
    return;
  }
  if (raw === null || raw === undefined) return;

  let record: ReservationRecord;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    record = parsed as ReservationRecord;
  } catch (error) {
    logger.warn("costLimit: reconcileCost parse failed", {
      reservationId,
      error: getErrorMessage(error),
    });
    return;
  }

  const tokenTc = estimateCostTenthsCent(
    record.model,
    actualUsage.promptTokens,
    actualUsage.completionTokens,
  );
  const groundingTc = groundingFeeTenthsCent(actualUsage.groundedRequestCount ?? 0);
  const actualTc = tokenTc + groundingTc;
  const deltaTc = actualTc - record.reservedTc;
  const now = new Date(record.createdAt);

  if (deltaTc !== 0) {
    try {
      await client.incrby(dailyKey(record.userKey, now), deltaTc);
      await client.incrby(hourlyKey(now), deltaTc);
    } catch (error) {
      logger.warn("costLimit: reconcileCost INCRBY failed", {
        reservationId,
        deltaTc,
        error: getErrorMessage(error),
      });
    }
  }

  try {
    await client.del(reservationKey(reservationId));
  } catch {
    /* best effort */
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

type DenialResult = Extract<ReserveResult, { allowed: false }>;

export function costLimitResponse(denial: DenialResult): NextResponse {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((new Date(denial.resetAt).getTime() - Date.now()) / 1000),
  );
  const body = {
    error: denial.scope === "user" ? "daily_cost_limit" : "global_cost_limit",
    scope: denial.scope,
    usedCents: denial.usedCents,
    limitCents: denial.limitCents,
    resetAt: denial.resetAt,
  };
  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(retryAfterSec),
      "X-Cost-Remaining": String(Math.max(0, denial.limitCents - denial.usedCents)),
      "X-Cost-Reset": denial.resetAt,
    },
  });
}
