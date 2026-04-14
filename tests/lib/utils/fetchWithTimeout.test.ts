import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it("resolves normally when the response comes back in time", async () => {
    global.fetch = vi.fn(async () => new Response("ok"));
    const res = await fetchWithTimeout("/x", {}, 1000);
    expect(res.ok).toBe(true);
  });

  it("throws a 'took longer than' error when the timeout fires first", async () => {
    global.fetch = vi.fn(
      (_input, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
          // never resolve naturally
        }),
    );

    const promise = fetchWithTimeout("/slow", {}, 1000);
    // Attach the assertion first so the rejection has a handler before
    // `advanceTimersByTimeAsync` flushes microtasks — otherwise Node flags
    // it as an unhandled rejection even though the test does handle it.
    const assertion = expect(promise).rejects.toThrow(/took longer than 1s/);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("propagates caller abort without rewriting the error", async () => {
    const callerController = new AbortController();
    global.fetch = vi.fn(
      (_input, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const promise = fetchWithTimeout("/x", { signal: callerController.signal }, 60_000);
    callerController.abort();
    await expect(promise).rejects.toThrow(/aborted/);
  });

  it("handles a caller signal that's already aborted before call", async () => {
    const c = new AbortController();
    c.abort();
    global.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      // When fetch receives an already-aborted signal, real browsers reject
      // synchronously. Mirror that here.
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException("aborted", "AbortError"));
      }
      return new Promise<Response>(() => {});
    });
    await expect(
      fetchWithTimeout("/x", { signal: c.signal }, 60_000),
    ).rejects.toThrow();
  });
});
