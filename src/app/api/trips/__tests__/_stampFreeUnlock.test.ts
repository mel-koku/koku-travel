// src/app/api/trips/__tests__/_stampFreeUnlock.test.ts
import { describe, it, expect, vi } from "vitest";
import { stampFreeUnlockedAt } from "@/app/api/trips/_stampFreeUnlock";

function makeChainableMock() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const mock: Record<string, unknown> = {
    update: vi.fn((...args: unknown[]) => {
      calls.push({ method: "update", args });
      return mock;
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return mock;
    }),
    is: vi.fn((...args: unknown[]) => {
      calls.push({ method: "is", args });
      return mock;
    }),
  };
  // Terminal: awaiting the chain resolves to { error: null }.
  Object.defineProperty(mock, "then", {
    value: (resolve: (v: unknown) => void) => resolve({ error: null }),
  });
  return { mock, calls };
}

describe("stampFreeUnlockedAt — WHERE clause idempotency", () => {
  it("issues UPDATE with id, user_id, free_unlocked_at IS NULL, unlocked_at IS NULL", async () => {
    const { mock, calls } = makeChainableMock();
    const supabase = {
      from: vi.fn(() => mock),
    } as unknown as Parameters<typeof stampFreeUnlockedAt>[0];

    await stampFreeUnlockedAt(supabase, "trip-123", "user-456");

    expect(supabase.from).toHaveBeenCalledWith("trips");

    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    expect(updateCall!.args[0]).toEqual(
      expect.objectContaining({ free_unlocked_at: expect.any(String) }),
    );

    const eqCalls = calls.filter((c) => c.method === "eq");
    expect(eqCalls).toHaveLength(2);
    expect(eqCalls[0].args).toEqual(["id", "trip-123"]);
    expect(eqCalls[1].args).toEqual(["user_id", "user-456"]);

    const isCalls = calls.filter((c) => c.method === "is");
    expect(isCalls).toHaveLength(2);
    expect(isCalls[0].args).toEqual(["free_unlocked_at", null]);
    expect(isCalls[1].args).toEqual(["unlocked_at", null]);
  });

  it("does not throw when Supabase returns an error", async () => {
    const mock: Record<string, unknown> = {
      update: vi.fn(() => mock),
      eq: vi.fn(() => mock),
      is: vi.fn(() => mock),
    };
    Object.defineProperty(mock, "then", {
      value: (resolve: (v: unknown) => void) =>
        resolve({ error: { message: "db down" } }),
    });
    const supabase = { from: vi.fn(() => mock) } as unknown as Parameters<
      typeof stampFreeUnlockedAt
    >[0];

    await expect(stampFreeUnlockedAt(supabase, "trip-1", "user-1")).resolves.toBeUndefined();
  });
});
