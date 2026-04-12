/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/data/festivalCalendar", () => ({
  getFestivalsForDay: vi.fn(() => []),
}));

import {
  generateDailyBriefings,
  buildDayBriefingPrompt,
  buildBriefingDaySchema,
  runBriefingBatch,
  type BriefingBatchOutcome,
} from "../dailyBriefingGenerator";
import { generateObject } from "ai";

const mockGenerateObject = vi.mocked(generateObject);

// ── buildDayBriefingPrompt ──────────────────────────────────────────────────

describe("buildDayBriefingPrompt", () => {
  const baseDay = {
    id: "d5",
    cityId: "osaka",
    activities: [
      { kind: "place", id: "a1", title: "Osaka Castle", tags: ["culture", "landmark"], timeOfDay: "morning" },
      { kind: "place", id: "a2", title: "Kuromon Market", tags: ["food", "market"], timeOfDay: "afternoon" },
    ],
  } as never;

  const baseBuilder = {
    dates: { start: "2026-05-01" },
    vibes: ["foodie_paradise"],
    style: "balanced" as const,
    group: { type: "couple" as const, size: 2 },
  } as never;

  it("includes the day number and total", () => {
    const p = buildDayBriefingPrompt(baseDay, 4, 13, baseBuilder);
    expect(p).toContain("Day 5 of 13");
  });

  it("includes the city name", () => {
    const p = buildDayBriefingPrompt(baseDay, 4, 13, baseBuilder);
    expect(p).toContain("osaka");
  });

  it("includes the day's activities", () => {
    const p = buildDayBriefingPrompt(baseDay, 4, 13, baseBuilder);
    expect(p).toContain("Osaka Castle");
    expect(p).toContain("Kuromon Market");
  });

  it("notes the first day on arrival", () => {
    const p = buildDayBriefingPrompt(baseDay, 0, 13, baseBuilder);
    expect(p.toLowerCase()).toContain("first day");
  });

  it("notes the final day on departure", () => {
    const p = buildDayBriefingPrompt(baseDay, 12, 13, baseBuilder);
    expect(p.toLowerCase()).toContain("final day");
  });

  it("asks for 2-4 sentences, max 80 words", () => {
    const p = buildDayBriefingPrompt(baseDay, 4, 13, baseBuilder);
    expect(p).toContain("2-4 sentence");
    expect(p).toContain("80 words");
  });

  it("includes the deny-list", () => {
    const p = buildDayBriefingPrompt(baseDay, 4, 13, baseBuilder);
    expect(p).toContain("amazing");
    expect(p).toContain("hidden gem");
  });
});

// ── buildBriefingDaySchema ──────────────────────────────────────────────────

describe("buildBriefingDaySchema", () => {
  it("accepts a valid briefing string", () => {
    const schema = buildBriefingDaySchema();
    const result = schema.safeParse({ briefing: "Temples quieter before 8 AM." });
    expect(result.success).toBe(true);
  });

  it("rejects missing briefing", () => {
    const schema = buildBriefingDaySchema();
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string briefing", () => {
    const schema = buildBriefingDaySchema();
    const result = schema.safeParse({ briefing: 123 });
    expect(result.success).toBe(false);
  });
});

// ── runBriefingBatch ────────────────────────────────────────────────────────

describe("runBriefingBatch", () => {
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

  it("yields one outcome per day on full success", async () => {
    mockGenerateObject
      .mockResolvedValueOnce({
        object: { briefing: "D1 briefing" },
      } as any)
      .mockResolvedValueOnce({
        object: { briefing: "D2 briefing" },
      } as any);

    const outcomes: BriefingBatchOutcome[] = [];
    for await (const outcome of runBriefingBatch(baseItinerary, baseBuilder)) {
      outcomes.push(outcome);
    }

    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.kind === "day")).toBe(true);
    const dayIds = outcomes
      .filter((o): o is Extract<BriefingBatchOutcome, { kind: "day" }> => o.kind === "day")
      .map((o) => o.dayId);
    expect(dayIds.sort()).toEqual(["d1", "d2"]);
  });

  it("yields day-failed when a day call rejects", async () => {
    mockGenerateObject
      .mockResolvedValueOnce({
        object: { briefing: "D1 briefing" },
      } as any)
      .mockRejectedValueOnce(
        Object.assign(new Error("boom"), { name: "AI_APICallError" }),
      );

    const outcomes: BriefingBatchOutcome[] = [];
    for await (const outcome of runBriefingBatch(baseItinerary, baseBuilder)) {
      outcomes.push(outcome);
    }

    expect(outcomes).toHaveLength(2);
    const failed = outcomes.find((o) => o.kind === "day-failed");
    expect(failed).toBeDefined();
    if (failed?.kind === "day-failed") {
      expect(failed.dayId).toBe("d2");
      expect(failed.dayIndex).toBe(1);
    }
  });
});

// ── generateDailyBriefings (drain layer) ────────────────────────────────────

describe("generateDailyBriefings (drain)", () => {
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

  it("returns null when itinerary.days is empty", async () => {
    const emptyItinerary = { id: "it", days: [] } as never;
    const result = await generateDailyBriefings(emptyItinerary, baseBuilder);
    expect(result).toBeNull();
  });

  it("returns a full GeneratedBriefings on happy path", async () => {
    mockGenerateObject
      .mockResolvedValueOnce({ object: { briefing: "D1 briefing" } } as any)
      .mockResolvedValueOnce({ object: { briefing: "D2 briefing" } } as any)
      .mockResolvedValueOnce({ object: { briefing: "D3 briefing" } } as any);

    const result = await generateDailyBriefings(baseItinerary, baseBuilder);
    expect(result).not.toBeNull();
    expect(result?.days).toHaveLength(3);
    expect(result?.days.map((d) => d.dayId).sort()).toEqual(["d1", "d2", "d3"]);
  });

  it("returns a shell with one day missing when that day's call fails", async () => {
    mockGenerateObject
      .mockResolvedValueOnce({ object: { briefing: "D1 briefing" } } as any)
      .mockRejectedValueOnce(
        Object.assign(new Error("day 2 boom"), { name: "AI_APICallError" }),
      )
      .mockResolvedValueOnce({ object: { briefing: "D3 briefing" } } as any);

    const result = await generateDailyBriefings(baseItinerary, baseBuilder);
    expect(result).not.toBeNull();
    expect(result?.days).toHaveLength(2);
    expect(result?.days.some((d) => d.dayId === "d2")).toBe(false);
    expect(result?.days.some((d) => d.dayId === "d1")).toBe(true);
    expect(result?.days.some((d) => d.dayId === "d3")).toBe(true);
  });

  it("returns an empty shell (NOT null) when every call fails", async () => {
    const err = Object.assign(new Error("boom"), { name: "AI_APICallError" });
    mockGenerateObject
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err);

    const result = await generateDailyBriefings(baseItinerary, baseBuilder);
    expect(result).not.toBeNull();
    expect(result?.days).toEqual([]);
  });

  it("sorts days by dayIndex regardless of completion order", async () => {
    let callCount = 0;
    mockGenerateObject.mockImplementation(async () => {
      callCount++;
      return { object: { briefing: `B${callCount}` } } as any;
    });

    const result = await generateDailyBriefings(baseItinerary, baseBuilder);
    expect(result?.days.map((d) => d.dayId)).toEqual(["d1", "d2", "d3"]);
  });

  it("omits days with empty briefing text from the shell", async () => {
    mockGenerateObject
      .mockResolvedValueOnce({ object: { briefing: "D1 briefing" } } as any)
      .mockResolvedValueOnce({ object: { briefing: "   " } } as any)
      .mockResolvedValueOnce({ object: { briefing: "D3 briefing" } } as any);

    const result = await generateDailyBriefings(baseItinerary, baseBuilder);
    expect(result?.days).toHaveLength(2);
    expect(result?.days.some((d) => d.dayId === "d2")).toBe(false);
  });
});
