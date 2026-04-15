import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkCostBudget,
  __setRedisForTests,
  __resetCostLimitForTests,
} from "@/lib/api/costLimit";

function createStubRedis() {
  const store = new Map<string, number>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    incrby: vi.fn(async (key: string, amount: number) => {
      const next = (store.get(key) ?? 0) + amount;
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
      store.set(key, Number(value) || 0);
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
