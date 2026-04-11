import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { scanForDenyListViolations, settleInOrder, type SettledOutcome } from "../guideProseGenerator";

describe("scanForDenyListViolations", () => {
  const makeGuide = (overview: string) => ({
    tripOverview: overview,
    days: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  it("should catch 'explore'", () => {
    const violations = scanForDenyListViolations(makeGuide("Explore the streets of Kyoto."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should catch 'discover'", () => {
    const violations = scanForDenyListViolations(makeGuide("Discover the local culture."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should catch 'wander'", () => {
    const violations = scanForDenyListViolations(makeGuide("Wander through the backstreets."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should catch standalone 'gem'", () => {
    const violations = scanForDenyListViolations(makeGuide("This place is a real gem."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should return empty array for clean text", () => {
    const violations = scanForDenyListViolations(makeGuide("Arrive at Kyoto Station by 9 AM. Head straight to Fushimi Inari."));
    expect(violations).toHaveLength(0);
  });
});

// ── settleInOrder ───────────────────────────────────────────────────────────

describe("settleInOrder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("yields all fulfilled outcomes in completion order", async () => {
    const resolveA = Promise.withResolvers<string>();
    const resolveB = Promise.withResolvers<string>();
    const resolveC = Promise.withResolvers<string>();

    const iter = settleInOrder(
      [resolveA.promise, resolveB.promise, resolveC.promise],
      10_000,
    );

    resolveB.resolve("B");
    resolveC.resolve("C");
    resolveA.resolve("A");

    const outcomes: Array<{ status: string; index: number; value?: string }> = [];
    for await (const outcome of iter) {
      outcomes.push({
        status: outcome.status,
        index: outcome.index,
        ...(outcome.status === "fulfilled" && { value: outcome.value }),
      });
    }

    expect(outcomes).toHaveLength(3);
    // Completion order: B resolved first, then C, then A
    expect(outcomes.map((o) => o.index)).toEqual([1, 2, 0]);
    expect(outcomes.every((o) => o.status === "fulfilled")).toBe(true);
  });

  it("yields rejection outcomes for rejected promises", async () => {
    const resolveA = Promise.withResolvers<string>();
    const resolveB = Promise.withResolvers<string>();

    const iter = settleInOrder([resolveA.promise, resolveB.promise], 10_000);

    const errorB = new Error("B failed");
    resolveB.reject(errorB);
    resolveA.resolve("A");

    const outcomes: SettledOutcome<string>[] = [];
    for await (const outcome of iter) {
      outcomes.push(outcome);
    }

    expect(outcomes).toHaveLength(2);
    const rejected = outcomes.find((o) => o.status === "rejected");
    const fulfilled = outcomes.find((o) => o.status === "fulfilled");
    expect(rejected).toEqual({ status: "rejected", reason: errorB, index: 1 });
    expect(fulfilled).toEqual({ status: "fulfilled", value: "A", index: 0 });
  });

  it("yields deadline outcomes for unsettled promises when deadline fires", async () => {
    const resolveA = Promise.withResolvers<string>();
    const resolveB = Promise.withResolvers<string>();  // never resolves
    const resolveC = Promise.withResolvers<string>();  // never resolves

    const iter = settleInOrder(
      [resolveA.promise, resolveB.promise, resolveC.promise],
      5_000,
    );

    resolveA.resolve("A");

    const outcomes: SettledOutcome<string>[] = [];
    const consumption = (async () => {
      for await (const outcome of iter) {
        outcomes.push(outcome);
      }
    })();

    // Advance past the deadline to trigger the timer.
    await vi.advanceTimersByTimeAsync(5_001);
    await consumption;

    expect(outcomes).toHaveLength(3);
    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const deadline = outcomes.filter((o) => o.status === "deadline");
    expect(fulfilled).toHaveLength(1);
    expect(deadline).toHaveLength(2);
    expect(deadline.map((o) => o.index).sort()).toEqual([1, 2]);
  });

  it("clears the deadline timer when iteration completes early", async () => {
    const resolveA = Promise.withResolvers<string>();

    const iter = settleInOrder([resolveA.promise], 10_000);

    resolveA.resolve("A");

    for await (const _outcome of iter) {
      // drain
    }

    // After iteration ends (early, before deadline), the deadline timer
    // should have been cleared by the finally block. vi.getTimerCount()
    // reports how many pending timers vitest tracks.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("completes immediately on empty input", async () => {
    const iter = settleInOrder<string>([], 10_000);
    const outcomes: SettledOutcome<string>[] = [];
    for await (const outcome of iter) {
      outcomes.push(outcome);
    }
    expect(outcomes).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
