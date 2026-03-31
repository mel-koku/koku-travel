import { describe, it, expect } from "vitest";
import { createTestBuilderData } from "../../fixtures/itinerary";
import {
  requiresLLMExtraction,
  extractIntentFromRules,
} from "@/lib/server/ruleBasedIntent";

// ruleBasedIntent.ts imports "server-only" — mock it for test environment
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("requiresLLMExtraction", () => {
  it("returns false when no notes or dietaryOther", () => {
    expect(requiresLLMExtraction(createTestBuilderData())).toBe(false);
  });

  it("returns false when notes is empty string", () => {
    expect(
      requiresLLMExtraction(
        createTestBuilderData({ accessibility: { notes: "  " } }),
      ),
    ).toBe(false);
  });

  it("returns true when notes has content", () => {
    expect(
      requiresLLMExtraction(
        createTestBuilderData({
          accessibility: { notes: "I want to visit Fushimi Inari" },
        }),
      ),
    ).toBe(true);
  });

  it("returns true when dietaryOther has content", () => {
    expect(
      requiresLLMExtraction(
        createTestBuilderData({
          accessibility: { dietaryOther: "severe nut allergy" },
        }),
      ),
    ).toBe(true);
  });
});

describe("extractIntentFromRules", () => {
  describe("pacing hint", () => {
    it("returns balanced for default style", () => {
      const result = extractIntentFromRules(createTestBuilderData());
      expect(result.pacingHint).toBe("balanced");
    });

    it("returns very_relaxed for relaxed pace + young children", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          style: "relaxed",
          group: { type: "family", size: 4, childrenAges: [3, 7] },
        }),
      );
      expect(result.pacingHint).toBe("very_relaxed");
    });

    it("returns relaxed for relaxed pace without young children", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({ style: "relaxed" }),
      );
      expect(result.pacingHint).toBe("relaxed");
    });

    it("returns intense for fast pace + solo", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          style: "fast",
          group: { type: "solo", size: 1 },
        }),
      );
      expect(result.pacingHint).toBe("intense");
    });

    it("returns active for fast pace + non-solo group", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          style: "fast",
          group: { type: "friends", size: 4 },
        }),
      );
      expect(result.pacingHint).toBe("active");
    });
  });

  describe("excluded categories", () => {
    it("excludes bar for families with children", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          group: { type: "family", size: 3, childrenAges: [8] },
        }),
      );
      expect(result.excludedCategories).toContain("bar");
    });

    it("excludes bar when minors present even without family type", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          group: { type: "friends", size: 4, childrenAges: [10] },
        }),
      );
      expect(result.excludedCategories).toContain("bar");
    });

    it("does not exclude bar for adult-only groups", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          group: { type: "couple", size: 2 },
        }),
      );
      expect(result.excludedCategories).not.toContain("bar");
    });
  });

  describe("category weights", () => {
    it("produces weights from vibes via vibesToCategoryWeights", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          vibes: ["temples_tradition"],
        }),
      );
      expect(result.categoryWeights).toHaveProperty("shrine");
      expect(result.categoryWeights).toHaveProperty("temple");
      expect(result.categoryWeights.shrine).toBeGreaterThan(1.0);
    });

    it("returns empty weights when no vibes selected", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({ vibes: undefined }),
      );
      expect(Object.keys(result.categoryWeights)).toHaveLength(0);
    });
  });

  describe("time preference", () => {
    it("returns morning_person for temples_tradition", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({ vibes: ["temples_tradition"] }),
      );
      expect(result.timePreference).toBe("morning_person");
    });

    it("returns night_owl for modern_japan", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({ vibes: ["modern_japan"] }),
      );
      expect(result.timePreference).toBe("night_owl");
    });

    it("returns no_preference when both morning and night vibes", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          vibes: ["temples_tradition", "modern_japan"],
        }),
      );
      expect(result.timePreference).toBe("no_preference");
    });

    it("returns no_preference for neutral vibes", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({ vibes: ["foodie_paradise"] }),
      );
      expect(result.timePreference).toBe("no_preference");
    });
  });

  describe("preferred tags", () => {
    it("derives tags from vibe filter map", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({ vibes: ["nature_adventure"] }),
      );
      expect(result.preferredTags).toContain("outdoor");
      expect(result.preferredTags).toContain("scenic");
    });

    it("deduplicates tags across vibes", () => {
      const result = extractIntentFromRules(
        createTestBuilderData({
          vibes: ["nature_adventure", "art_architecture"],
        }),
      );
      // "scenic" appears in both vibes but should only appear once
      const scenicCount = result.preferredTags?.filter((t) => t === "scenic").length ?? 0;
      expect(scenicCount).toBe(1);
    });
  });

  describe("fields that require NLP", () => {
    it("always returns empty pinnedLocations", () => {
      const result = extractIntentFromRules(createTestBuilderData());
      expect(result.pinnedLocations).toEqual([]);
    });

    it("always returns empty dayConstraints", () => {
      const result = extractIntentFromRules(createTestBuilderData());
      expect(result.dayConstraints).toEqual([]);
    });

    it("always returns empty additionalInsights", () => {
      const result = extractIntentFromRules(createTestBuilderData());
      expect(result.additionalInsights).toEqual([]);
    });
  });

  describe("shape conformance", () => {
    it("returns a valid IntentExtractionResult", () => {
      const result = extractIntentFromRules(createTestBuilderData());
      expect(result).toHaveProperty("pinnedLocations");
      expect(result).toHaveProperty("excludedCategories");
      expect(result).toHaveProperty("dayConstraints");
      expect(result).toHaveProperty("pacingHint");
      expect(result).toHaveProperty("categoryWeights");
      expect(result).toHaveProperty("preferredTags");
      expect(result).toHaveProperty("timePreference");
      expect(result).toHaveProperty("additionalInsights");
    });
  });
});
