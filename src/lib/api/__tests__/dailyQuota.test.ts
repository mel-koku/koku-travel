import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock Redis before importing the module.
// Use a plain class so `new Redis(...)` inside the module under test returns
// an instance that exposes the mock methods. The older pattern
// `Redis: vi.fn().mockImplementation(() => ({...}))` stopped behaving as a
// constructor in vitest 4 — the implementation function no longer sets `this`
// properly when called with `new`.
const mockIncr = vi.fn();
const mockExpire = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    incr = mockIncr;
    expire = mockExpire;
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    upstashRedisRestUrl: "https://fake-redis.upstash.io",
    upstashRedisRestToken: "fake-token",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/utils/errorUtils", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

import { checkDailyQuota, _resetForTesting, type DailyQuotaConfig } from "../dailyQuota";

const TEST_QUOTA: DailyQuotaConfig = { name: "test-endpoint", maxPerDay: 5 };

describe("Daily Quota", () => {
  beforeEach(() => {
    _resetForTesting();
    mockIncr.mockReset();
    mockExpire.mockReset();
  });

  it("should allow first request and set TTL", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    const result = await checkDailyQuota("user-123", TEST_QUOTA);

    expect(result).toBeNull();
    expect(mockIncr).toHaveBeenCalledOnce();
    expect(mockExpire).toHaveBeenCalledOnce();
  });

  it("should allow requests under the limit", async () => {
    mockIncr.mockResolvedValue(3);

    const result = await checkDailyQuota("user-123", TEST_QUOTA);

    expect(result).toBeNull();
    // Should NOT set TTL again (count > 1)
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it("should allow the exact limit request", async () => {
    mockIncr.mockResolvedValue(5); // maxPerDay = 5

    const result = await checkDailyQuota("user-123", TEST_QUOTA);

    expect(result).toBeNull();
  });

  it("should reject requests over the limit with 429", async () => {
    mockIncr.mockResolvedValue(6); // over maxPerDay = 5

    const result = await checkDailyQuota("user-123", TEST_QUOTA);

    expect(result).toBeInstanceOf(NextResponse);
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.code).toBe("DAILY_QUOTA_EXCEEDED");
    expect(body.retryAfter).toBeGreaterThan(0);

    expect(result!.headers.get("X-DailyQuota-Limit")).toBe("5");
    expect(result!.headers.get("X-DailyQuota-Remaining")).toBe("0");
    expect(result!.headers.get("X-DailyQuota-Reset")).toBeTruthy();
  });

  it("should use separate counters for different users", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    await checkDailyQuota("user-a", TEST_QUOTA);
    await checkDailyQuota("user-b", TEST_QUOTA);

    const calls = mockIncr.mock.calls;
    expect(calls[0][0]).toContain("user-a");
    expect(calls[1][0]).toContain("user-b");
    expect(calls[0][0]).not.toBe(calls[1][0]);
  });

  it("should use separate counters for different quota names", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    await checkDailyQuota("user-123", { name: "chat", maxPerDay: 50 });
    await checkDailyQuota("user-123", { name: "itinerary-plan", maxPerDay: 15 });

    const calls = mockIncr.mock.calls;
    expect(calls[0][0]).toContain("chat");
    expect(calls[1][0]).toContain("itinerary-plan");
    expect(calls[0][0]).not.toBe(calls[1][0]);
  });

  it("should fail open when Redis throws an error", async () => {
    mockIncr.mockRejectedValue(new Error("Redis connection lost"));

    const result = await checkDailyQuota("user-123", TEST_QUOTA);

    expect(result).toBeNull(); // allowed through
  });

  it("should include the date in the Redis key", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    try {
      await checkDailyQuota("user-123", TEST_QUOTA);

      const key = mockIncr.mock.calls[0][0] as string;
      // Key should contain today's date in yyyy-mm-dd format
      const today = new Date().toISOString().slice(0, 10);
      expect(key).toContain(today);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Daily Quota - No Redis", () => {
  beforeEach(() => {
    _resetForTesting();
    mockIncr.mockReset();
  });

  it("should allow all requests when Redis is not configured", async () => {
    // Override env mock for this test
    const envMod = await import("@/lib/env");
    const originalUrl = envMod.env.upstashRedisRestUrl;
    const originalToken = envMod.env.upstashRedisRestToken;
    (envMod.env as Record<string, unknown>).upstashRedisRestUrl = undefined;
    (envMod.env as Record<string, unknown>).upstashRedisRestToken = undefined;

    _resetForTesting();
    const result = await checkDailyQuota("user-123", TEST_QUOTA);

    expect(result).toBeNull();
    expect(mockIncr).not.toHaveBeenCalled();

    // Restore
    (envMod.env as Record<string, unknown>).upstashRedisRestUrl = originalUrl;
    (envMod.env as Record<string, unknown>).upstashRedisRestToken = originalToken;
  });
});
