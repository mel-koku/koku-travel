import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initLLMMocks,
  setupLLMEnv,
  teardownLLMEnv,
} from "../../fixtures/llmMocks";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestBuilderData,
} from "../../fixtures/itinerary";

// Mock server-only, AI SDK, and season utils
vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/utils/seasonUtils", () => ({
  getSeason: vi.fn().mockReturnValue("spring"),
}));

// Import after mocks
import { generateObject } from "ai";
const { generateGuideProse } = await import(
  "@/lib/server/guideProseGenerator"
);

const day1 = createTestItineraryDay({
  id: "day-1",
  activities: [
    createTestPlaceActivity({
      title: "Kiyomizu Temple",
      tags: ["culture", "temple"],
      neighborhood: "Higashiyama",
    }),
    createTestPlaceActivity({
      title: "Nishiki Market",
      tags: ["food", "market"],
      neighborhood: "Downtown",
    }),
  ],
});

const day2 = createTestItineraryDay({
  id: "day-2",
  activities: [
    createTestPlaceActivity({
      title: "Fushimi Inari",
      tags: ["culture", "shrine"],
    }),
  ],
});

const itinerary = createTestItinerary({ days: [day1, day2] });

describe("generateGuideProse", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initLLMMocks();
  });
  afterEach(() => {
    teardownLLMEnv();
  });

  describe("graceful degradation", () => {
    it("returns null when API key missing", async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      const result = await generateGuideProse(
        itinerary,
        createTestBuilderData(),
      );
      expect(result).toBeNull();
    });

    it("returns null when days empty", async () => {
      setupLLMEnv();
      const emptyItinerary = createTestItinerary({ days: [] });
      const result = await generateGuideProse(
        emptyItinerary,
        createTestBuilderData(),
      );
      expect(result).toBeNull();
    });

    it("returns an empty shell (NOT null) on total Gemini error", async () => {
      // New drain behavior: total LLM failure returns empty shell so partial
      // success (e.g., header succeeds but all days fail) can still be preserved.
      setupLLMEnv();
      vi.mocked(generateObject).mockRejectedValue(new Error("Gemini API error"));
      const result = await generateGuideProse(
        itinerary,
        createTestBuilderData(),
      );
      expect(result).not.toBeNull();
      expect(result?.tripOverview).toBeUndefined();
      expect(result?.days).toEqual([]);
    });

    it("returns an empty shell (NOT null) on timeout", async () => {
      // New drain behavior: deadline expiry returns a shell with whatever
      // partial results arrived before the deadline fired.
      setupLLMEnv();
      vi.mocked(generateObject).mockImplementation(
        ({ abortSignal }: { abortSignal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            if (abortSignal) {
              abortSignal.addEventListener("abort", () =>
                reject(new DOMException("The operation was aborted.", "AbortError")),
              );
            }
          }),
      );
      vi.useFakeTimers();
      const promise = generateGuideProse(itinerary, createTestBuilderData());
      await vi.advanceTimersByTimeAsync(20_000);
      const result = await promise;
      expect(result).not.toBeNull();
      expect(result?.days).toEqual([]);
      vi.useRealTimers();
    });
  });

  describe("partial success", () => {
    it("returns a shell with available days when some day calls fail", async () => {
      setupLLMEnv();
      // Header succeeds, day-1 succeeds, day-2 fails
      vi.mocked(generateObject)
        .mockResolvedValueOnce({ object: { tripOverview: "Two days in Kyoto." } } as never)
        .mockResolvedValueOnce({
          object: { intro: "Higashiyama wakes slowly.", transitions: [], summary: "A quiet start." },
        } as never)
        .mockRejectedValueOnce(new Error("day-2 error"));

      const result = await generateGuideProse(itinerary, createTestBuilderData());

      expect(result).not.toBeNull();
      expect(result?.tripOverview).toBe("Two days in Kyoto.");
      expect(result?.days).toHaveLength(1);
      expect(result?.days[0]?.dayId).toBe("day-1");
    });
  });

  describe("success", () => {
    it("returns GeneratedGuide with tripOverview and per-day guides", async () => {
      setupLLMEnv();
      // The new drain makes N+1 separate calls: 1 header + N day calls.
      vi.mocked(generateObject)
        .mockResolvedValueOnce({
          object: { tripOverview: "A two-day journey through Kyoto's temples and markets." },
        } as never)
        .mockResolvedValueOnce({
          object: {
            intro: "Higashiyama wakes slowly.",
            transitions: ["The path narrows past the pottery shops."],
            culturalMoment: "Kiyomizu means 'pure water'.",
            practicalTip: "Get an IC card at the station.",
            summary: "A day of worn stone and good noodles.",
          },
        } as never)
        .mockResolvedValueOnce({
          object: {
            intro: "The foxes guard the mountain.",
            transitions: [],
            summary: "Quiet trails above the city.",
          },
        } as never);

      const result = await generateGuideProse(
        itinerary,
        createTestBuilderData(),
      );
      expect(result?.tripOverview).toBeTruthy();
      expect(result?.days[0]?.dayId).toBe("day-1");
      expect(result?.days[0]?.intro).toBeTruthy();
      expect(result?.days[0]?.summary).toBeTruthy();
      expect(result?.days[1]?.dayId).toBe("day-2");
    });

    it("returns guide sorted by day order regardless of call settlement order", async () => {
      setupLLMEnv();
      vi.mocked(generateObject)
        .mockResolvedValueOnce({ object: { tripOverview: "H" } } as never)
        .mockResolvedValueOnce({
          object: { intro: "Day 1", transitions: [], summary: "S1" },
        } as never)
        .mockResolvedValueOnce({
          object: { intro: "Day 2", transitions: [], summary: "S2" },
        } as never);

      const result = await generateGuideProse(itinerary, createTestBuilderData());

      expect(result?.days.map((d) => d.dayId)).toEqual(["day-1", "day-2"]);
    });
  });
});
