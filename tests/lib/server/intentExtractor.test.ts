import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initLLMMocks,
  setupLLMEnv,
  teardownLLMEnv,
  mockGenerateObjectSuccess,
  mockGenerateObjectFailure,
  mockGenerateObjectTimeout,
} from "../../fixtures/llmMocks";
import { createTestBuilderData } from "../../fixtures/itinerary";
import type { IntentExtractionResult } from "@/types/llmConstraints";

// Mock server-only and AI SDK
vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockReturnValue("mock-model"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
const { extractTripIntent } = await import("@/lib/server/intentExtractor");

describe("extractTripIntent", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initLLMMocks();
  });

  afterEach(() => {
    teardownLLMEnv();
  });

  describe("graceful degradation", () => {
    it("returns null when API key is missing", async () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const result = await extractTripIntent(createTestBuilderData());
      expect(result).toBeNull();
    });

    it("returns null on Gemini error", async () => {
      setupLLMEnv();
      mockGenerateObjectFailure(new Error("quota exceeded"));
      const result = await extractTripIntent(createTestBuilderData());
      expect(result).toBeNull();
    });

    it("returns null on timeout", async () => {
      setupLLMEnv();
      mockGenerateObjectTimeout();
      // The 5s timeout is set inside extractTripIntent, but our mock
      // fires the AbortError immediately when signal fires.
      // We need to fast-forward timers.
      vi.useFakeTimers();
      const promise = extractTripIntent(createTestBuilderData());
      vi.advanceTimersByTime(5500);
      const result = await promise;
      expect(result).toBeNull();
      vi.useRealTimers();
    });
  });

  describe("output processing", () => {
    const validResult: IntentExtractionResult = {
      pinnedLocations: [
        { locationName: "Fushimi Inari", reason: "Must-see shrine" },
      ],
      excludedCategories: ["bar"],
      dayConstraints: [],
      pacingHint: "balanced",
      categoryWeights: { shrine: 1.5, restaurant: 1.2 },
      timePreference: "morning_person",
      additionalInsights: ["Traveler mentioned early mornings"],
    };

    it("returns structured result on success", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess(validResult);
      const result = await extractTripIntent(createTestBuilderData());
      expect(result).not.toBeNull();
      expect(result?.pinnedLocations).toHaveLength(1);
      expect(result?.excludedCategories).toContain("bar");
      expect(result?.pacingHint).toBe("balanced");
    });

    it("clamps categoryWeights to [0.5, 2.0]", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        ...validResult,
        categoryWeights: { shrine: 3.0, restaurant: 0.1 },
      });
      const result = await extractTripIntent(createTestBuilderData());
      expect(result?.categoryWeights.shrine).toBe(2.0);
      expect(result?.categoryWeights.restaurant).toBe(0.5);
    });
  });

  describe("input handling", () => {
    it("handles missing notes gracefully", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        pinnedLocations: [],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      });
      const result = await extractTripIntent(
        createTestBuilderData({ accessibility: undefined }),
      );
      expect(result).not.toBeNull();
    });

    it("handles missing interests gracefully", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        pinnedLocations: [],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      });
      const result = await extractTripIntent(
        createTestBuilderData({ interests: undefined }),
      );
      expect(result).not.toBeNull();
    });

    it("handles missing group gracefully", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        pinnedLocations: [],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      });
      const result = await extractTripIntent(
        createTestBuilderData({ group: undefined }),
      );
      expect(result).not.toBeNull();
    });
  });
});
