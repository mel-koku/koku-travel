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
vi.mock("@/lib/server/llmProvider", () => ({
  getModel: vi.fn().mockReturnValue("mock-model"),
  VERTEX_PROVIDER_OPTIONS: { google: { streamFunctionCallArguments: false } },
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

  // Helper: builder data WITH notes to trigger Gemini path (rule-based skips Gemini)
  const builderWithNotes = () =>
    createTestBuilderData({
      accessibility: { notes: "I want to visit Fushimi Inari on day 1" },
    });

  describe("graceful degradation", () => {
    it("returns null when API key is missing", async () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const result = await extractTripIntent(builderWithNotes());
      expect(result).toBeNull();
    });

    it("returns null on Gemini error", async () => {
      setupLLMEnv();
      mockGenerateObjectFailure(new Error("quota exceeded"));
      const result = await extractTripIntent(builderWithNotes());
      expect(result).toBeNull();
    });

    it("returns null on timeout", async () => {
      setupLLMEnv();
      mockGenerateObjectTimeout();
      // The 5s timeout is set inside extractTripIntent, but our mock
      // fires the AbortError immediately when signal fires.
      // We need to fast-forward timers.
      vi.useFakeTimers();
      const promise = extractTripIntent(builderWithNotes());
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
      const result = await extractTripIntent(builderWithNotes());
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
      const result = await extractTripIntent(builderWithNotes());
      expect(result?.categoryWeights.shrine).toBe(2.0);
      expect(result?.categoryWeights.restaurant).toBe(0.5);
    });
  });

  describe("rule-based fast path", () => {
    it("uses rule-based parser when no notes are present", async () => {
      setupLLMEnv();
      // No notes = rule-based path, Gemini should NOT be called
      const result = await extractTripIntent(createTestBuilderData());
      expect(result).not.toBeNull();
      // Rule-based always returns empty pinnedLocations
      expect(result?.pinnedLocations).toEqual([]);
    });

    it("falls through to Gemini when notes are present", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        pinnedLocations: [{ locationName: "Fushimi Inari", reason: "Requested" }],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      });
      const result = await extractTripIntent(builderWithNotes());
      expect(result).not.toBeNull();
      expect(result?.pinnedLocations).toHaveLength(1);
    });
  });

  describe("input handling", () => {
    it("handles missing notes gracefully (rule-based path)", async () => {
      setupLLMEnv();
      const result = await extractTripIntent(
        createTestBuilderData({ accessibility: undefined }),
      );
      // No notes = rule-based path returns a valid result
      expect(result).not.toBeNull();
    });

    it("handles missing interests gracefully (Gemini path)", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        pinnedLocations: [],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      });
      const result = await extractTripIntent(
        createTestBuilderData({
          interests: undefined,
          accessibility: { notes: "some notes" },
        }),
      );
      expect(result).not.toBeNull();
    });

    it("handles missing group gracefully (Gemini path)", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        pinnedLocations: [],
        excludedCategories: [],
        dayConstraints: [],
        categoryWeights: {},
        additionalInsights: [],
      });
      const result = await extractTripIntent(
        createTestBuilderData({
          group: undefined,
          accessibility: { notes: "some notes" },
        }),
      );
      expect(result).not.toBeNull();
    });
  });
});
