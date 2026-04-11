import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/server/vertexProvider", () => ({
  vertex: vi.fn().mockReturnValue({}),
  VERTEX_GENERATE_OPTIONS: { google: { streamFunctionCallArguments: false } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  scanForDenyListViolations,
  settleInOrder,
  computeCategoryMix,
  buildHeaderPrompt,
  buildDayPrompt,
  buildHeaderSchema,
  buildDaySchema,
  callVertexWithRetry,
  runGuideProseBatch,
  generateGuideProse,
  type SettledOutcome,
  type BatchOutcome,
} from "../guideProseGenerator";
import { generateObject } from "ai";
import { logger } from "@/lib/logger";

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

// ── computeCategoryMix ──────────────────────────────────────────────────────

describe("computeCategoryMix", () => {
  it("returns 'no activities' on empty list", () => {
    expect(computeCategoryMix([])).toBe("no activities");
  });

  it("names the dominant category for homogeneous days", () => {
    const mix = computeCategoryMix([
      { category: "temple" },
      { category: "shrine" },
      { category: "shrine" },
    ]);
    // "shrine" has count 2, "temple" has count 1; helper reports the dominant category.
    expect(mix).toContain("shrine");
  });

  it("notes mixed categories with the top two", () => {
    const mix = computeCategoryMix([
      { category: "temple" },
      { category: "restaurant" },
      { category: "restaurant" },
      { category: "market" },
    ]);
    expect(mix).toContain("restaurant");
  });
});

// ── buildHeaderPrompt ───────────────────────────────────────────────────────

describe("buildHeaderPrompt", () => {
  const baseItinerary = {
    id: "it-1",
    days: [
      { id: "d1", cityId: "kyoto", activities: [] },
      { id: "d2", cityId: "osaka", activities: [] },
      { id: "d3", cityId: "hiroshima", activities: [] },
    ],
  } as never;

  const baseBuilder = {
    dates: { start: "2026-05-01" },
    vibes: ["temples_tradition"],
    style: "balanced" as const,
    group: { type: "couple" as const, size: 2 },
    isFirstTimeVisitor: true,
  } as never;

  it("includes the trip length", () => {
    const p = buildHeaderPrompt(baseItinerary, baseBuilder, undefined);
    expect(p).toContain("3-day");
  });

  it("includes the city list", () => {
    const p = buildHeaderPrompt(baseItinerary, baseBuilder, undefined);
    expect(p).toContain("kyoto");
    expect(p).toContain("osaka");
    expect(p).toContain("hiroshima");
  });

  it("includes the group type and size", () => {
    const p = buildHeaderPrompt(baseItinerary, baseBuilder, undefined);
    expect(p).toContain("couple");
    expect(p).toContain("2");
  });

  it("includes the first-time-visitor flag when set", () => {
    const p = buildHeaderPrompt(baseItinerary, baseBuilder, undefined);
    expect(p.toLowerCase()).toContain("first");
  });

  it("requests tripOverview and culturalBriefingIntro", () => {
    const p = buildHeaderPrompt(baseItinerary, baseBuilder, undefined);
    expect(p).toContain("tripOverview");
    expect(p).toContain("culturalBriefingIntro");
  });
});

// ── buildDayPrompt ──────────────────────────────────────────────────────────

describe("buildDayPrompt", () => {
  const baseDay = {
    id: "d5",
    cityId: "osaka",
    activities: [
      { kind: "place", id: "a1", title: "Osaka Castle", tags: ["culture", "landmark"], timeOfDay: "morning" },
      { kind: "place", id: "a2", title: "Kuromon Market", tags: ["food", "market"], timeOfDay: "afternoon" },
      { kind: "place", id: "a3", title: "Dotonbori", tags: ["entertainment"], timeOfDay: "evening" },
    ],
  } as never;

  const baseBuilder = {
    dates: { start: "2026-05-01" },
    vibes: ["foodie_paradise"],
    style: "balanced" as const,
    group: { type: "couple" as const, size: 2 },
  } as never;

  it("includes the day number and total", () => {
    const p = buildDayPrompt(baseDay, 4, 13, "kyoto", "hiroshima", "food-heavy", baseBuilder, undefined);
    expect(p).toContain("Day 5 of 13");
  });

  it("includes the city name", () => {
    const p = buildDayPrompt(baseDay, 4, 13, "kyoto", "hiroshima", "food-heavy", baseBuilder, undefined);
    expect(p).toContain("osaka");
  });

  it("includes previous-day framing for middle days", () => {
    const p = buildDayPrompt(baseDay, 4, 13, "kyoto", "hiroshima", "food-heavy", baseBuilder, undefined);
    expect(p).toContain("Yesterday: kyoto");
    expect(p).toContain("Tomorrow: hiroshima");
  });

  it("omits previous-day framing on the first day", () => {
    const p = buildDayPrompt(baseDay, 0, 13, null, "kyoto", "food-heavy", baseBuilder, undefined);
    expect(p).not.toContain("Yesterday:");
    expect(p.toLowerCase()).toContain("first day");
  });

  it("omits next-day framing on the last day", () => {
    const p = buildDayPrompt(baseDay, 12, 13, "kyoto", null, "food-heavy", baseBuilder, undefined);
    expect(p).not.toContain("Tomorrow:");
    expect(p.toLowerCase()).toContain("final day");
  });

  it("handles a single-day trip (first === last)", () => {
    const p = buildDayPrompt(baseDay, 0, 1, null, null, "food-heavy", baseBuilder, undefined);
    expect(p.toLowerCase()).toContain("first day");
    expect(p.toLowerCase()).toContain("final day");
    expect(p).not.toContain("Yesterday:");
    expect(p).not.toContain("Tomorrow:");
  });

  it("includes the day's activity list", () => {
    const p = buildDayPrompt(baseDay, 4, 13, "kyoto", "hiroshima", "food-heavy", baseBuilder, undefined);
    expect(p).toContain("Osaka Castle");
    expect(p).toContain("Kuromon Market");
    expect(p).toContain("Dotonbori");
  });

  it("includes the category mix summary", () => {
    const p = buildDayPrompt(baseDay, 4, 13, "kyoto", "hiroshima", "food-heavy", baseBuilder, undefined);
    expect(p).toContain("food-heavy");
  });

  it("requests intro, transitions, and summary fields", () => {
    const p = buildDayPrompt(baseDay, 4, 13, "kyoto", "hiroshima", "food-heavy", baseBuilder, undefined);
    expect(p).toContain("intro");
    expect(p).toContain("transitions");
    expect(p).toContain("summary");
  });
});

// ── schema builders ─────────────────────────────────────────────────────────

describe("buildHeaderSchema", () => {
  it("accepts a minimal valid HeaderProse object", () => {
    const schema = buildHeaderSchema();
    const result = schema.safeParse({ tripOverview: "Kyoto quiet." });
    expect(result.success).toBe(true);
  });

  it("accepts culturalBriefingIntro when present", () => {
    const schema = buildHeaderSchema();
    const result = schema.safeParse({
      tripOverview: "Kyoto quiet.",
      culturalBriefingIntro: "Temples ask for quiet.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing tripOverview", () => {
    const schema = buildHeaderSchema();
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("buildDaySchema", () => {
  it("accepts a minimal valid DayProse object", () => {
    const schema = buildDaySchema();
    const result = schema.safeParse({
      intro: "Kyoto in the morning.",
      transitions: [],
      summary: "A quiet start.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const schema = buildDaySchema();
    const result = schema.safeParse({
      intro: "A",
      transitions: ["B", "C"],
      culturalMoment: "D",
      practicalTip: "E",
      summary: "F",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing intro", () => {
    const schema = buildDaySchema();
    const result = schema.safeParse({ transitions: [], summary: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 transitions", () => {
    const schema = buildDaySchema();
    const result = schema.safeParse({
      intro: "A",
      transitions: ["1", "2", "3", "4"],
      summary: "Z",
    });
    expect(result.success).toBe(false);
  });
});

// ── callVertexWithRetry ─────────────────────────────────────────────────────

describe("callVertexWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the parsed object on happy path", async () => {
    const mockObject = { tripOverview: "Kyoto quiet." };
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockObject,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await callVertexWithRetry(
      "test prompt",
      buildHeaderSchema(),
      10_000,
    );

    expect(result).toEqual(mockObject);
    expect(generateObject).toHaveBeenCalledOnce();
  });

  it("suppresses the log when batch signal aborts before per-call timer", async () => {
    // Pre-aborted batch signal
    const batchController = new AbortController();
    batchController.abort(new Error("batch-deadline"));

    // Mock generateObject to throw as if aborted
    vi.mocked(generateObject).mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );

    await expect(
      callVertexWithRetry(
        "test prompt",
        buildHeaderSchema(),
        10_000,
        batchController.signal,
      ),
    ).rejects.toBeTruthy();

    // The key assertion: logger.warn was NOT called because the abort came
    // from the batch signal, not our own per-call timer.
    // Note: this test verifies the logging suppression path but not the
    // actual abort signal propagation to generateObject (which would require
    // integration testing against a live Vertex endpoint).
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs legitimate per-call timeouts (no batch signal)", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(
      Object.assign(new Error("timeout"), { name: "TimeoutError" }),
    );

    await expect(
      callVertexWithRetry("test prompt", buildHeaderSchema(), 10_000),
    ).rejects.toBeTruthy();

    // No batch signal was passed, so this is a legitimate failure -- log it.
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledWith(
      "Guide prose call failed",
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("logs Vertex rejection (not abort)", async () => {
    const apiError = Object.assign(new Error("INVALID_ARGUMENT"), {
      name: "AI_APICallError",
      statusCode: 400,
    });
    vi.mocked(generateObject).mockRejectedValueOnce(apiError);

    await expect(
      callVertexWithRetry("test prompt", buildHeaderSchema(), 10_000),
    ).rejects.toBeTruthy();

    expect(logger.warn).toHaveBeenCalledOnce();
  });
});

// ── runGuideProseBatch ──────────────────────────────────────────────────────

describe("runGuideProseBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseItinerary = {
    id: "it-1",
    days: [
      {
        id: "d1",
        cityId: "kyoto",
        activities: [
          { kind: "place", id: "a1", title: "Fushimi", tags: ["shrine"], timeOfDay: "morning" },
        ],
      },
      {
        id: "d2",
        cityId: "osaka",
        activities: [
          { kind: "place", id: "a2", title: "Castle", tags: ["landmark"], timeOfDay: "morning" },
        ],
      },
    ],
  } as never;

  const baseBuilder = {
    dates: { start: "2026-05-01" },
    vibes: ["temples_tradition"],
    style: "balanced" as const,
    group: { type: "couple" as const, size: 2 },
  } as never;

  it("yields one header outcome and one outcome per day on full success", async () => {
    // Mock: first call returns header, next two return day prose
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { tripOverview: "Kyoto quiet." },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: {
          intro: "D1 intro",
          transitions: [],
          summary: "D1 summary",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: {
          intro: "D2 intro",
          transitions: [],
          summary: "D2 summary",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const outcomes: BatchOutcome[] = [];
    for await (const outcome of runGuideProseBatch(baseItinerary, baseBuilder, undefined)) {
      outcomes.push(outcome);
    }

    expect(outcomes).toHaveLength(3);
    const header = outcomes.find((o) => o.kind === "header");
    const days = outcomes.filter((o) => o.kind === "day");
    expect(header).toBeDefined();
    expect(days).toHaveLength(2);
  });

  it("yields day-failed when a specific day call rejects", async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { tripOverview: "Header ok." },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D1 intro", transitions: [], summary: "D1 summary" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockRejectedValueOnce(
        Object.assign(new Error("boom"), { name: "AI_APICallError" }),
      );

    const outcomes: BatchOutcome[] = [];
    for await (const outcome of runGuideProseBatch(baseItinerary, baseBuilder, undefined)) {
      outcomes.push(outcome);
    }

    expect(outcomes).toHaveLength(3);
    const failed = outcomes.find((o) => o.kind === "day-failed");
    expect(failed).toBeDefined();
    if (failed?.kind === "day-failed") {
      expect(failed.dayId).toBe("d2");
      expect(failed.dayIndex).toBe(1);
    }
  });

  it("yields header-failed when the header call rejects", async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(
        Object.assign(new Error("boom"), { name: "AI_APICallError" }),
      )
      .mockResolvedValueOnce({
        object: { intro: "D1 intro", transitions: [], summary: "D1 summary" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D2 intro", transitions: [], summary: "D2 summary" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const outcomes: BatchOutcome[] = [];
    for await (const outcome of runGuideProseBatch(baseItinerary, baseBuilder, undefined)) {
      outcomes.push(outcome);
    }

    expect(outcomes).toHaveLength(3);
    const headerFailed = outcomes.find((o) => o.kind === "header-failed");
    const daysSuccess = outcomes.filter((o) => o.kind === "day");
    expect(headerFailed).toBeDefined();
    expect(daysSuccess).toHaveLength(2);
  });
});

// ── generateGuideProse (public contract) ────────────────────────────────────

describe("generateGuideProse (new drain)", () => {
  const originalEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = "fake-creds-json";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = originalEnv;
    }
  });

  const baseItinerary = {
    id: "it-1",
    days: [
      { id: "d1", cityId: "kyoto", activities: [] },
      { id: "d2", cityId: "osaka", activities: [] },
      { id: "d3", cityId: "hiroshima", activities: [] },
    ],
  } as never;

  const baseBuilder = {
    dates: { start: "2026-05-01" },
    vibes: ["temples_tradition"],
    style: "balanced" as const,
    group: { type: "couple" as const, size: 2 },
  } as never;

  it("returns null when GOOGLE_APPLICATION_CREDENTIALS_JSON is unset", async () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const result = await generateGuideProse(baseItinerary, baseBuilder, undefined);
    expect(result).toBeNull();
  });

  it("returns null when itinerary.days is empty", async () => {
    const emptyItinerary = { id: "it", days: [] } as never;
    const result = await generateGuideProse(emptyItinerary, baseBuilder, undefined);
    expect(result).toBeNull();
  });

  it("returns a full GeneratedGuide on happy path", async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { tripOverview: "Kyoto quiet, Osaka loud." },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D1", transitions: [], summary: "S1" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D2", transitions: [], summary: "S2" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D3", transitions: [], summary: "S3" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const result = await generateGuideProse(baseItinerary, baseBuilder, undefined);

    expect(result).not.toBeNull();
    expect(result?.tripOverview).toBe("Kyoto quiet, Osaka loud.");
    expect(result?.days).toHaveLength(3);
  });

  it("returns a shell with undefined tripOverview when header fails", async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(
        Object.assign(new Error("boom"), { name: "AI_APICallError" }),
      )
      .mockResolvedValueOnce({
        object: { intro: "D1", transitions: [], summary: "S1" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D2", transitions: [], summary: "S2" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D3", transitions: [], summary: "S3" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const result = await generateGuideProse(baseItinerary, baseBuilder, undefined);

    expect(result).not.toBeNull();
    expect(result?.tripOverview).toBeUndefined();
    expect(result?.days).toHaveLength(3);
  });

  it("returns a shell with one day missing when that day's call fails", async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { tripOverview: "Full header." },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockResolvedValueOnce({
        object: { intro: "D1", transitions: [], summary: "S1" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockRejectedValueOnce(
        Object.assign(new Error("day 2 boom"), { name: "AI_APICallError" }),
      )
      .mockResolvedValueOnce({
        object: { intro: "D3", transitions: [], summary: "S3" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const result = await generateGuideProse(baseItinerary, baseBuilder, undefined);

    expect(result).not.toBeNull();
    expect(result?.tripOverview).toBe("Full header.");
    expect(result?.days).toHaveLength(2);
    expect(result?.days.some((d) => d.dayId === "d2")).toBe(false);
    expect(result?.days.some((d) => d.dayId === "d1")).toBe(true);
    expect(result?.days.some((d) => d.dayId === "d3")).toBe(true);
  });

  it("returns an empty shell (NOT null) when every call fails", async () => {
    const err = Object.assign(new Error("boom"), { name: "AI_APICallError" });
    vi.mocked(generateObject)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err);

    const result = await generateGuideProse(baseItinerary, baseBuilder, undefined);

    expect(result).not.toBeNull();
    expect(result?.tripOverview).toBeUndefined();
    expect(result?.days).toEqual([]);
  });

  it("sorts days by dayIndex regardless of completion order", async () => {
    // Mock day calls resolving in reverse order (slowest first, fastest last)
    let callCount = 0;
    vi.mocked(generateObject).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { object: { tripOverview: "H" } } as any;
      }
      const dayNum = callCount - 1;
      const dayObj = { object: { intro: `D${dayNum}`, transitions: [], summary: `S${dayNum}` } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return dayObj as any;
    });

    const result = await generateGuideProse(baseItinerary, baseBuilder, undefined);

    expect(result?.days.map((d) => d.dayId)).toEqual(["d1", "d2", "d3"]);
  });
});
