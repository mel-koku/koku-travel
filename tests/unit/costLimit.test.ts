import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkCostBudget,
  reserveCost,
  reconcileCost,
  __setRedisForTests,
  __resetCostLimitForTests,
} from "@/lib/api/costLimit";

function createStubRedis() {
  const store = new Map<string, number | string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    incrby: vi.fn(async (key: string, amount: number) => {
      const current = store.get(key);
      const base = typeof current === "number" ? current : Number(current) || 0;
      const next = base + amount;
      store.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => 1),
    del: vi.fn(async (key: string) => {
      const had = store.has(key);
      store.delete(key);
      return had ? 1 : 0;
    }),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
  };
}

describe("checkCostBudget", () => {
  beforeEach(() => {
    __resetCostLimitForTests();
  });

  it("returns zero usage when no counters exist", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const result = await checkCostBudget("user-123");

    expect(result.user.usedCents).toBe(0);
    expect(result.user.limitCents).toBe(200);
    expect(result.global.usedCents).toBe(0);
    expect(result.global.limitCents).toBe(5000);
  });

  it("reflects stored daily and hourly counters", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
    redis.store.set(`cost:daily:user-123:${today}`, 500);
    redis.store.set(`cost:global:hourly:${hour}`, 10000);

    const result = await checkCostBudget("user-123");

    expect(result.user.usedCents).toBe(50);
    expect(result.global.usedCents).toBe(1000);
  });
});

describe("reserveCost", () => {
  beforeEach(() => {
    __resetCostLimitForTests();
  });

  it("returns allowed with reservationId when under budget", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const result = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash-lite",
      inputTokens: 1000,
      maxOutputTokens: 500,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(typeof result.reservationId).toBe("string");
      expect(result.reservationId.length).toBeGreaterThan(0);
    }
  });

  it("INCRBYs daily and hourly counters with estimated cost", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash-lite",
      inputTokens: 1_000_000,
      maxOutputTokens: 1_000_000,
    });

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(500);
    expect(redis.store.get(`cost:global:hourly:${hour}`)).toBe(500);
  });

  it("returns 429 with user scope when daily counter exceeds limit", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    redis.store.set(`cost:daily:user-1:${today}`, 1999);

    const result = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash",
      inputTokens: 1_000_000,
      maxOutputTokens: 1_000_000,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.scope).toBe("user");
      expect(result.limitCents).toBe(200);
    }
  });

  it("returns 429 with global scope when hourly counter exceeds limit", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
    redis.store.set(`cost:global:hourly:${hour}`, 49_999);

    // flash-lite + small tokens keeps daily under 2000 TC so only global trips
    const result = await reserveCost({
      key: "user-global-test",
      model: "gemini-2.5-flash-lite",
      inputTokens: 100_000,
      maxOutputTokens: 100_000,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.scope).toBe("global");
      expect(result.limitCents).toBe(5000);
    }
  });

  it("rolls back INCRBYs when budget exceeded mid-reservation", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    redis.store.set(`cost:daily:user-1:${today}`, 1990);
    const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");

    await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash",
      inputTokens: 1_000_000,
      maxOutputTokens: 1_000_000,
    });

    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(1990);
    expect(redis.store.get(`cost:global:hourly:${hour}`) ?? 0).toBe(0);
  });

  it("fails closed at global when Redis throws", async () => {
    const redis = createStubRedis();
    redis.incrby = vi.fn(async () => {
      throw new Error("redis down");
    });
    __setRedisForTests(redis as never);

    const result = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash",
      inputTokens: 100,
      maxOutputTokens: 100,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.scope).toBe("global");
    }
  });
});

describe("reconcileCost", () => {
  beforeEach(() => {
    __resetCostLimitForTests();
  });

  it("applies negative delta when actual usage is lower than reserved", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const reservation = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash-lite",
      inputTokens: 1_000_000,
      maxOutputTokens: 1_000_000,
    });
    expect(reservation.allowed).toBe(true);
    if (!reservation.allowed) return;

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(500);

    await reconcileCost(reservation.reservationId, {
      promptTokens: 1_000_000,
      completionTokens: 500_000,
    });

    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(300);
  });

  it("applies positive delta when actual usage exceeds reserved estimate", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const reservation = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash-lite",
      inputTokens: 1_000_000,
      maxOutputTokens: 500_000,
    });
    if (!reservation.allowed) throw new Error("expected allowed");

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(300);

    await reconcileCost(reservation.reservationId, {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });

    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(500);
  });

  it("is a no-op when reservationId is unknown", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    await reconcileCost("unknown-id", { promptTokens: 100, completionTokens: 100 });
    expect(redis.store.size).toBe(0);
  });

  it("adds the $0.035-per-request grounding fee when groundedRequestCount > 0", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    // Reserve at gemini-2.5-flash-lite: 100 input + 100 output tc/M tokens.
    // 1M input × 1 + 500k output × 4 / 1M = 100 + 200 = 300 tc reserved.
    const reservation = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash-lite",
      inputTokens: 1_000_000,
      maxOutputTokens: 500_000,
    });
    if (!reservation.allowed) throw new Error("expected allowed");

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(300);

    // Actual: same token usage as reserved (token delta = 0) + 6 grounded
    // requests = 6 × 35 = 210 tc grounding fee. Daily counter should land
    // at 300 (initial reserve) + 210 (grounding delta) = 510 tc.
    await reconcileCost(reservation.reservationId, {
      promptTokens: 1_000_000,
      completionTokens: 500_000,
      groundedRequestCount: 6,
    });

    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(510);
  });

  it("does not add a grounding fee when groundedRequestCount is 0 or omitted", async () => {
    const redis = createStubRedis();
    __setRedisForTests(redis as never);

    const reservation = await reserveCost({
      key: "user-1",
      model: "gemini-2.5-flash-lite",
      inputTokens: 1_000_000,
      maxOutputTokens: 500_000,
    });
    if (!reservation.allowed) throw new Error("expected allowed");

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // Omitted field — non-grounded reconcile path stays identical.
    await reconcileCost(reservation.reservationId, {
      promptTokens: 1_000_000,
      completionTokens: 500_000,
    });

    expect(redis.store.get(`cost:daily:user-1:${today}`)).toBe(300);
  });
});

describe("costLimitResponse", () => {
  it("serializes a user-scope 429 with body and headers", async () => {
    const { costLimitResponse } = await import("@/lib/api/costLimit");
    const response = costLimitResponse({
      allowed: false,
      scope: "user",
      usedCents: 199,
      limitCents: 200,
      resetAt: "2099-04-16T00:00:00.000Z",
    });

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({
      error: "daily_cost_limit",
      scope: "user",
      usedCents: 199,
      limitCents: 200,
      resetAt: "2099-04-16T00:00:00.000Z",
    });
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(response.headers.get("X-Cost-Remaining")).toBe("1");
    expect(response.headers.get("X-Cost-Reset")).toBe("2099-04-16T00:00:00.000Z");
  });

  it("uses global_cost_limit code for global scope", async () => {
    const { costLimitResponse } = await import("@/lib/api/costLimit");
    const response = costLimitResponse({
      allowed: false,
      scope: "global",
      usedCents: 4999,
      limitCents: 5000,
      resetAt: "2099-04-15T18:00:00.000Z",
    });
    const body = await response.json();
    expect(body.error).toBe("global_cost_limit");
    expect(body.scope).toBe("global");
  });
});
