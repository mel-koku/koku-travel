import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAndIncrement } from "@/lib/addressSearch/rateLimit";

const upsertMock = vi.fn();
const selectMock = vi.fn();
const rpcMock = vi.fn();

const mockClient = {
  rpc: rpcMock,
  from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: selectMock }) }) }),
    upsert: upsertMock,
  }),
} as unknown as Parameters<typeof checkAndIncrement>[0];

beforeEach(() => {
  rpcMock.mockReset();
  upsertMock.mockReset();
  selectMock.mockReset();
});

describe("checkAndIncrement", () => {
  it("allows a new session when user has no usage today", async () => {
    rpcMock.mockResolvedValueOnce({ data: 1, error: null });
    const result = await checkAndIncrement(mockClient, "user-1", 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it("denies when user has hit daily cap", async () => {
    rpcMock.mockResolvedValueOnce({ data: 101, error: null });
    const result = await checkAndIncrement(mockClient, "user-1", 100);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
