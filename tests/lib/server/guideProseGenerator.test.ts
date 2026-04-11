import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initLLMMocks,
  setupLLMEnv,
  teardownLLMEnv,
  mockGenerateObjectSuccess,
  mockGenerateObjectFailure,
  mockGenerateObjectTimeout,
} from "../../fixtures/llmMocks";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestBuilderData,
} from "../../fixtures/itinerary";
import type { GeneratedGuide } from "@/types/llmConstraints";

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

const validGuide: GeneratedGuide = {
  tripOverview: "A two-day journey through Kyoto's temples and markets.",
  days: [
    {
      dayId: "day-1",
      intro: "Higashiyama wakes slowly.",
      transitions: ["The path narrows past the pottery shops."],
      culturalMoment: "Kiyomizu means 'pure water'.",
      practicalTip: "Get an IC card at the station.",
      summary: "A day of worn stone and good noodles.",
    },
    {
      dayId: "day-2",
      intro: "The foxes guard the mountain.",
      transitions: [],
      summary: "Quiet trails above the city.",
    },
  ],
};

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

    it("returns null on Gemini error", async () => {
      setupLLMEnv();
      mockGenerateObjectFailure();
      const result = await generateGuideProse(
        itinerary,
        createTestBuilderData(),
      );
      expect(result).toBeNull();
    });

    it("returns null on timeout", async () => {
      setupLLMEnv();
      mockGenerateObjectTimeout();
      vi.useFakeTimers();
      const promise = generateGuideProse(itinerary, createTestBuilderData());
      vi.advanceTimersByTime(19000);
      const result = await promise;
      expect(result).toBeNull();
      vi.useRealTimers();
    });
  });

  describe("validation", () => {
    it("returns null when returned day IDs are incomplete", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        tripOverview: "Overview",
        days: [
          {
            dayId: "day-1",
            intro: "Intro",
            transitions: [],
            summary: "Summary",
          },
          // Missing day-2
        ],
      });
      const result = await generateGuideProse(
        itinerary,
        createTestBuilderData(),
      );
      expect(result).toBeNull();
    });

    it("returns guide when all day IDs match", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess(validGuide);
      const result = await generateGuideProse(
        itinerary,
        createTestBuilderData(),
      );
      expect(result).not.toBeNull();
      expect(result?.tripOverview).toBe(validGuide.tripOverview);
      expect(result?.days).toHaveLength(2);
    });
  });

  describe("success", () => {
    it("returns GeneratedGuide with tripOverview and per-day guides", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess(validGuide);
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
  });
});
